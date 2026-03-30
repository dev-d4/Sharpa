import json
import sys


# ── Category labels (Swedish) ─────────────────────────────────────────────────

CATEGORY_LABELS = {
    "Equity": "Aktiefonder",
    "Fixed Income": "Räntefonder",
    "Allocation": "Blandfonder",
    "Alternative": "Alternativa fonder",
    "Convertibles": "Konvertibler",
    "Money Market": "Penningmarknadsfonder",
    "Other": "Övrigt",
}


def category_label(group):
    if not group:
        return "Övrigt"
    return CATEGORY_LABELS.get(group, group)


# ── Weighted average (skips None values) ──────────────────────────────────────

def weighted_avg(entries, get_value):
    sum_w = 0.0
    sum_v = 0.0
    for e in entries:
        fund = e.get("fund")
        if not fund:
            continue
        v = get_value(fund)
        if v is None:
            continue
        sum_w += e["weight"]
        sum_v += v * e["weight"]
    return sum_v / sum_w if sum_w > 0 else None


# ── Fund swap suggestions ─────────────────────────────────────────────────────

def absolute_score(fund):
    """
    Score a fund on absolute metrics so rankings are consistent and transitive.
    Sharpe (risk-adjusted return) carries the most weight.
    Cost is penalised. Return adds a smaller boost.
    """
    score = 0.0
    score += (fund.get("sharpe_3yr") or 0) * 3
    score += (fund.get("return_3yr") or 0) * 0.05
    score += (fund.get("return_1yr") or 0) * 0.02
    cost = fund.get("ongoing_cost_actual") or fund.get("ongoing_cost_estimated") or 0
    score -= cost * 1.5
    return score


def generate_swaps(entries, all_funds):
    suggestions = []

    portfolio_isins = {e["fund"]["isin"] for e in entries if e.get("fund")}

    for entry in entries:
        current = entry["fund"]

        # Find all funds in the same category except the current fund itself.
        # Portfolio funds are intentionally included — if one of them is the
        # best in the category, we suggest consolidating into it.
        peers = [
            f for f in all_funds
            if f["isin"] != current["isin"]
            and f.get("category") is not None
            and f.get("category") == current.get("category")
        ]
        if not peers:
            continue

        # Pick the highest-scoring peer by absolute score
        best = max(peers, key=absolute_score)

        # Only suggest if it actually scores better than the current fund
        if absolute_score(best) <= absolute_score(current):
            continue

        consolidate = best["isin"] in portfolio_isins

        # Build reason text
        parts = []
        improvement = {}

        if best.get("sharpe_3yr") is not None and current.get("sharpe_3yr") is not None:
            diff = best["sharpe_3yr"] - current["sharpe_3yr"]
            if diff > 0:
                parts.append(f"bättre Sharpe ({best['sharpe_3yr']:.2f} vs {current['sharpe_3yr']:.2f})")
                improvement["sharpe"] = diff

        b_cost = best.get("ongoing_cost_actual") or best.get("ongoing_cost_estimated")
        c_cost = current.get("ongoing_cost_actual") or current.get("ongoing_cost_estimated")
        if b_cost is not None and c_cost is not None and b_cost < c_cost:
            parts.append(f"lägre avgift ({b_cost:.2f}% vs {c_cost:.2f}%)")
            improvement["cost"] = c_cost - b_cost

        if best.get("return_1yr") is not None and current.get("return_1yr") is not None:
            if best["return_1yr"] > current["return_1yr"]:
                parts.append(
                    f"högre 1-årsavkastning ({best['return_1yr']:.1f}% vs {current['return_1yr']:.1f}%)"
                )
                improvement["return1yr"] = best["return_1yr"] - current["return_1yr"]

        suggestions.append({
            "currentFund": current,
            "suggestedFund": best,
            "reason": ", ".join(parts),
            "improvement": improvement,
            "consolidate": consolidate,
        })

    return suggestions


# ── Summary text ──────────────────────────────────────────────────────────────

def build_summary(category_breakdown, avg_cost, return_1yr, return_3yr, sharpe, not_found, total_weight):
    lines = []

    top = category_breakdown[:3]
    if top:
        desc = ", ".join(f"{c['weight']:.0f}% {c['label'].lower()}" for c in top)
        lines.append(f"Din portfölj består till {desc}.")

    if avg_cost is not None:
        if avg_cost < 0.5:
            lines.append(
                f"Den genomsnittliga avgiften är låg ({avg_cost:.2f}%), "
                f"vilket är bra för din långsiktiga avkastning."
            )
        elif avg_cost < 1.0:
            lines.append(
                f"Den genomsnittliga avgiften är {avg_cost:.2f}%, "
                f"vilket är rimligt men det kan finnas billigare alternativ."
            )
        else:
            lines.append(
                f"Den genomsnittliga avgiften är relativt hög ({avg_cost:.2f}%). "
                f"Det kan löna sig att se över fonderna."
            )

    if return_1yr is not None:
        lines.append(f"Förväntad avkastning (senaste 12 månader, viktad): {return_1yr:.1f}%.")

    if return_3yr is not None:
        lines.append(f"Annualiserad 3-årsavkastning (viktad): {return_3yr:.1f}% per år.")

    if sharpe is not None:
        if sharpe > 1:
            lines.append(f"Sharpe-kvoten är {sharpe:.2f}, vilket indikerar god riskjusterad avkastning.")
        elif sharpe > 0:
            lines.append(
                f"Sharpe-kvoten är {sharpe:.2f}, vilket är godkänt men det finns utrymme för förbättring."
            )
        else:
            lines.append(f"Sharpe-kvoten är {sharpe:.2f}, vilket tyder på låg riskjusterad avkastning.")

    if abs(total_weight - 100) > 0.01:
        lines.append(f"OBS: Vikterna summerar till {total_weight:.1f}%, inte 100%.")

    if not_found:
        lines.append(f"Följande ISIN hittades inte: {', '.join(not_found)}.")

    return " ".join(lines)


# ── Suggested portfolio ───────────────────────────────────────────────────────

def build_suggested_metrics(found, swap_suggestions):
    """
    Apply swap suggestions to the current portfolio and compute metrics
    for the resulting suggested portfolio.
    Returns None if no suggestions exist.
    """
    if not swap_suggestions:
        return None

    swap_map = {s["currentFund"]["isin"]: s for s in swap_suggestions}

    # Build suggested portfolio: accumulate weights by target ISIN
    new_portfolio = {}  # isin -> {"fund": ..., "weight": ...}
    for entry in found:
        fund = entry["fund"]
        isin = fund["isin"]
        weight = entry["weight"]

        if isin in swap_map:
            target = swap_map[isin]["suggestedFund"]
            target_isin = target["isin"]
            if target_isin in new_portfolio:
                new_portfolio[target_isin]["weight"] += weight
            else:
                new_portfolio[target_isin] = {"fund": target, "weight": weight}
        else:
            if isin in new_portfolio:
                new_portfolio[isin]["weight"] += weight
            else:
                new_portfolio[isin] = {"fund": fund, "weight": weight}

    suggested_entries = [
        {"fund": v["fund"], "weight": v["weight"]}
        for v in new_portfolio.values()
    ]

    return {
        "avgCost": weighted_avg(suggested_entries, lambda f: f.get("ongoing_cost_actual") or f.get("ongoing_cost_estimated")),
        "weightedReturn1yr": weighted_avg(suggested_entries, lambda f: f.get("return_1yr")),
        "weightedReturn3yr": weighted_avg(suggested_entries, lambda f: f.get("return_3yr")),
        "weightedSharpe": weighted_avg(suggested_entries, lambda f: f.get("sharpe_3yr")),
        "funds": [
            {"name": v["fund"]["name"], "isin": v["fund"]["isin"], "weight": v["weight"]}
            for v in new_portfolio.values()
        ],
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def analyze_portfolio(entries, all_funds):
    found = [e for e in entries if e.get("fund")]
    not_found = [e["isin"] for e in entries if not e.get("fund")]
    total_weight = sum(e["weight"] for e in found)

    # Category breakdown
    cat_map = {}
    for e in found:
        label = category_label(e["fund"].get("category_group"))
        cat_map[label] = cat_map.get(label, 0) + e["weight"]

    category_breakdown = sorted(
        [
            {"label": label, "weight": (w / total_weight * 100) if total_weight else 0}
            for label, w in cat_map.items()
        ],
        key=lambda x: x["weight"],
        reverse=True,
    )

    avg_cost = weighted_avg(found, lambda f: f.get("ongoing_cost_actual") or f.get("ongoing_cost_estimated"))
    return_1yr = weighted_avg(found, lambda f: f.get("return_1yr"))
    return_3yr = weighted_avg(found, lambda f: f.get("return_3yr"))
    sharpe = weighted_avg(found, lambda f: f.get("sharpe_3yr"))

    swap_suggestions = generate_swaps(found, all_funds)

    summary_text = build_summary(
        category_breakdown, avg_cost, return_1yr, return_3yr, sharpe, not_found, total_weight
    )

    suggested_metrics = build_suggested_metrics(found, swap_suggestions)

    return {
        "totalWeight": total_weight,
        "notFound": not_found,
        "categoryBreakdown": category_breakdown,
        "avgCost": avg_cost,
        "weightedReturn1yr": return_1yr,
        "weightedReturn3yr": return_3yr,
        "weightedSharpe": sharpe,
        "swapSuggestions": swap_suggestions,
        "summaryText": summary_text,
        "suggestedMetrics": suggested_metrics,
    }


if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    result = analyze_portfolio(data["entries"], data["allFunds"])
    sys.stdout.write(json.dumps(result))
