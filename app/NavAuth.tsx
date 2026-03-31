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
      <button
        onClick={async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          setUser(null);
        }}
        className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        Logga ut
      </button>
    );
  }

  return (
    <Link
      href="/login"
      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
    >
      Logga in
    </Link>
  );
}
