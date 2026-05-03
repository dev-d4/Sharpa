"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { RISK_LABELS, RISK_EQUITY, calcRiskScore, type RiskLevel } from "@/lib/risk";

const QUESTIONS = [
  {
    key: "q1",
    question: "Hur lång är din investeringshorisont?",
    description: "Hur länge planerar du att ha pengarna investerade?",
    options: ["Under 1 år", "1–3 år", "3–7 år", "7–15 år", "Mer än 15 år"],
  },
  {
    key: "q2",
    question: "Om din portfölj föll med 20%, vad skulle du göra?",
    description: "Tänk på hur du faktiskt skulle reagera, inte hur du tror att du borde reagera.",
    options: ["Säljer allt", "Säljer lite", "Avvaktar", "Köper lite mer", "Köper mer"],
  },
  {
    key: "q3",
    question: "Hur viktig är den här investeringen för dig?",
    description: "Vad händer om du förlorar en stor del av kapitalet?",
    options: [
      "Kan inte förlora något",
      "Kan förlora lite",
      "Accepterar viss förlust",
      "Accepterar stor förlust",
      "Spelar ingen roll",
    ],
  },
  {
    key: "q4",
    question: "Vad är viktigast för dig?",
    description: "Välj det alternativ som bäst speglar din inställning.",
    options: ["Minimera risk", "Låg risk", "Balans risk/avkastning", "Hög avkastning", "Maximera avkastning"],
  },
];

export default function RiskProfileClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);
  const [existing, setExisting] = useState<{ score: RiskLevel; label: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);


  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) { setAuthed(false); setLoading(false); return; }
      fetch("/api/risk-profile")
        .then((r) => r.json())
        .then((p) => {
          if (p) {
            setExisting({ score: p.score, label: p.label });
            setAnswers({ q1: p.q1, q2: p.q2, q3: p.q3, q4: p.q4 });
          } else {
            setEditing(true);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [router]);

  async function handleSubmit() {
    if (Object.keys(answers).length < 4) return;
    setSaving(true);
    try {
      const res = await fetch("/api/risk-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      if (res.ok) {
        router.push("/risk-profile/result");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto px-6 py-24 text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Logga in för att fortsätta</h1>
          <p className="text-sm text-slate-500 mt-2">Du behöver ett konto för att skapa och spara din riskprofil.</p>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors"
        >
          Logga in
        </button>
      </div>
    );
  }

  // Show existing profile with option to redo
  if (existing && !editing) {
    const score = existing.score as RiskLevel;
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Din riskprofil</h1>
          <p className="text-sm text-slate-500 mt-1">Baserat på dina svar</p>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-900">{existing.label}</p>
              <p className="text-sm text-slate-500 mt-0.5">{RISK_EQUITY[score]}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 mb-1">Risknivå</p>
              <p className="text-3xl font-bold text-blue-600">{score}<span className="text-lg text-slate-300">/5</span></p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex gap-1.5">
            {([1, 2, 3, 4, 5] as RiskLevel[]).map((lvl) => (
              <div key={lvl} className="flex-1 space-y-1">
                <div className={`h-2 rounded-full ${lvl <= score ? "bg-blue-500" : "bg-slate-100"}`} />
                <p className={`hidden sm:block text-xs text-center ${lvl === score ? "text-blue-600 font-semibold" : "text-slate-400"}`}>
                  {RISK_LABELS[lvl]}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-600 font-semibold sm:hidden">{RISK_LABELS[score]}</p>
        </section>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/account")}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Tillbaka till konto
          </button>
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-slate-300 transition-colors"
          >
            Uppdatera
          </button>
        </div>
      </div>
    );
  }

  // Questionnaire
  const allAnswered = QUESTIONS.every((q) => answers[q.key]);
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ta fram din riskprofil</h1>
        <p className="text-sm text-slate-500 mt-1">Svara på 4 frågor — tar under en minut.</p>
      </div>

      {(() => {
        const q = QUESTIONS[currentStep];
        const qi = currentStep;
        return (
        <section key={q.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Fråga {qi + 1} av 4</p>
            <h2 className="font-bold text-slate-900">{q.question}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{q.description}</p>
          </div>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const value = i + 1;
              const selected = answers[q.key] === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setAnswers((prev) => ({ ...prev, [q.key]: value }));
                  }}                  
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    selected
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </section>
      );
    })()}

      {allAnswered && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800">
          <span className="font-semibold">Din preliminära profil: </span>
          {RISK_LABELS[calcRiskScore(answers.q1, answers.q2, answers.q3, answers.q4)]}
          {" — "}
          {RISK_EQUITY[calcRiskScore(answers.q1, answers.q2, answers.q3, answers.q4)]}
        </div>
      )}

    {currentStep < QUESTIONS.length - 1 ? (
      <button
        onClick={() => setCurrentStep((s) => s + 1)}
        disabled={!answers[QUESTIONS[currentStep].key]}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-xl py-3 transition-colors"
      >
        Nästa fråga →
      </button>
    ) : (
      <button
        onClick={handleSubmit}
        disabled={!allAnswered || saving}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 disabled:from-blue-300 disabled:to-blue-300 text-white font-medium rounded-xl py-3 transition-all shadow-md shadow-blue-200"
      >
        {saving ? "Sparar…" : "Spara riskprofil"}
      </button>
    )}
    </div>
  );
}
