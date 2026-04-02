"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

export default function NavAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (user) {
    return (
      <div className="flex items-center gap-4 sm:gap-6">
        <Link
          href="/risk-profile"
          className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          Riskprofil
        </Link>
        <Link
          href="/account"
          className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          Mitt konto
        </Link>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-sm shadow-blue-200"
    >
      Logga in
    </Link>
  );
}
