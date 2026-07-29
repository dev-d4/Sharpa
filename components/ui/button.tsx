import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Exakt tre knappstilar i hela produkten:
 *
 *   primary   — fylld accent, vit text. Högst en per vy.
 *   secondary — vit yta med kontrollkant.
 *   link      — accentfärgad textlänk med diskret understrykning.
 *
 * Inga pillerformer, inga dekorativa pilar, ingen skugga, ingen hover-lyft.
 * 44px höjd på primär/sekundär för att klara mobilens träffyta.
 */
export type ButtonVariant = "primary" | "secondary" | "link";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xs text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: `${base} h-11 px-5 bg-accent text-white hover:bg-accent-hover active:bg-accent-press`,
  secondary: `${base} h-11 px-5 border border-line-strong bg-white text-ink hover:bg-section`,
  link: "text-accent underline underline-offset-2 decoration-line-strong transition-colors duration-150 hover:decoration-accent",
};

export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  return cn(variants[variant], className);
}

type CommonProps = {
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
};

type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

type ButtonLinkProps = CommonProps &
  Omit<React.ComponentProps<typeof Link>, "className" | "children">;

export function Button({ variant = "primary", className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({ variant = "primary", className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, className)} {...rest}>
      {children}
    </Link>
  );
}
