"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

export default function NavAuth({ variant = "header" }: { variant?: "header" | "footer" }) {
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
      <Link
        href="/account"
        className={variant === "footer" ? "hover:text-slate-600 transition-colors" : "text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"}
      >
        Mitt konto
      </Link>
    );
  }

  if (variant === "footer") {
    return (
      <Link href="/login" className="hover:text-slate-600 transition-colors">
        Logga in
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-sm shadow-blue-200"
    >
      Logga in
    </Link>
  );
}
