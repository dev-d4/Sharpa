"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function IntegrationLogin() {
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/radgivning/fundguide/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/radgivning/fundguide");
      router.refresh();
    } else {
      setError("Fel lösenord. Försök igen.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-slate-500" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Integrationsguide</h1>
            <p className="text-sm text-slate-400">Ange lösenord för att fortsätta</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Lösenord"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-widest"
            />
            {error && (
              <p className="text-xs text-red-600 text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {loading ? "Kontrollerar…" : "Logga in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
