import { NextRequest, NextResponse } from "next/server";
import { Fund } from "@/lib/supabase";
import { fetchAvanzaFunds } from "@/lib/avanza";
import { spawn } from "child_process";
import path from "path";

function runPythonAnalysis(input: object): Promise<object> {
  return new Promise((resolve, reject) => {
    const script = path.join(process.cwd(), "scripts", "analyze.py");
    const py = spawn("python3", [script]);

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (chunk) => (stdout += chunk));
    py.stderr.on("data", (chunk) => (stderr += chunk));

    py.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `Python exited with code ${code}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error(`Ogiltigt svar från analysskript: ${stdout}`));
      }
    });

    py.stdin.write(JSON.stringify(input));
    py.stdin.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entries: { isin: string; weight: number }[] = body.entries;

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: "Inga fonder angivna" }, { status: 400 });
    }

    // Fetch all funds from Avanza cache
    const allFunds = await fetchAvanzaFunds();
    const fundMap = new Map<string, Fund>(allFunds.map((f) => [f.isin, f]));

    // Attach fund data to each portfolio entry
    const portfolioEntries = entries.map((e) => ({
      isin: e.isin.trim().toUpperCase(),
      weight: e.weight,
      fund: fundMap.get(e.isin.trim().toUpperCase()) ?? null,
    }));

    // Find peer funds in the same categories for swap suggestions
    const categories = new Set(
      portfolioEntries.filter((e) => e.fund?.category).map((e) => e.fund!.category!)
    );
    const peerFunds = allFunds.filter(
      (f) => f.category !== null && categories.has(f.category)
    );

    const analysis = await runPythonAnalysis({
      entries: portfolioEntries,
      allFunds: peerFunds,
    });

    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
