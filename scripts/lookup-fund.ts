import { readFileSync } from "fs";
import { join } from "path";

const raw = JSON.parse(
  readFileSync(join(process.cwd(), "data/avanza-funds.json"), "utf-8")
) as { funds: { isin: string; name: string; category: string | null; category_group: string | null; selection_id?: string | null }[] };

const query = process.argv[2] ?? "Sverige Index";

const matches = raw.funds.filter(f =>
  f.name.toLowerCase().includes(query.toLowerCase())
);

console.log(`\nSökning: "${query}" — ${matches.length} träffar\n`);
console.table(matches.map(f => ({
  isin: f.isin,
  name: f.name,
  category: f.category,
  category_group: f.category_group,
})));
