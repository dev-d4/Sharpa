"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { markResumeRedirected, peekResumePath } from "@/lib/resume-session";

/**
 * Skyddsnät för inloggningens återhopp.
 *
 * Normalt bär `?next=` användaren tillbaka till sidan hen kom från, men det
 * hållet kan brytas — t.ex. om Supabase faller tillbaka på Site URL för en
 * magisk länk vars redirect inte är godkänd. Landar man då på startsidan eller
 * portföljlistan trots att ett verktyg väntar, skickar vi tillbaka användaren.
 *
 * Bara sidor som är rimliga "fel landningar" fångas, och bara en gång per
 * inloggning (posten markeras som förbrukad).
 */
const CATCH_PATHS = new Set(["/", "/portfolios"]);

export default function ResumeAfterLogin() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname) return;

    const target = peekResumePath();
    if (!target) return;

    // Framme igen: posten får inte kapa en senare navigering. Vi markerar den
    // bara som förbrukad i stället för att radera — verktyget på sidan läser
    // sitt sparade tillstånd i sin egen mount-effekt, som kör efter den här.
    if (target.split("?")[0] === pathname) {
      markResumeRedirected();
      return;
    }

    if (!CATCH_PATHS.has(pathname)) return;

    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session?.user) return;
      markResumeRedirected();
      router.replace(target);
    });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
