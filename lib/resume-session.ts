/**
 * Återupptagning efter inloggning.
 *
 * När en utloggad användare klickar "Logga in" mitt i ett verktyg sparas både
 * var hen var och det hen hade gjort. Inloggningen kan bryta flikkontexten —
 * en magisk länk öppnas ofta i en ny flik, där sessionStorage är tom — därför
 * lagras posten i localStorage.
 *
 * Posten är avsiktligt kortlivad och engångs: den skrivs bara vid ett
 * inloggningsklick, den läses en gång och raderas då. Utloggat arbete ska
 * alltså aldrig dyka upp igen vid ett senare, orelaterat besök.
 */

const KEY = "sharpa_resume";
const TTL_MS = 30 * 60 * 1000;

/** Verktyg lyssnar på detta för att hinna spara sitt tillstånd innan användaren skickas till inloggningen. */
export const BEFORE_LOGIN_EVENT = "fondanalys:before-login";

type ResumeRecord = {
  path: string;
  data: unknown;
  savedAt: number;
  /** Sätts när användaren redan skickats tillbaka, så vi inte kapar en senare navigering. */
  redirected?: boolean;
};

function read(): ResumeRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const record = JSON.parse(raw) as ResumeRecord;
    if (!record?.path || typeof record.savedAt !== "number") return null;
    if (Date.now() - record.savedAt > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

/** Sparar var användaren var (och valfritt vad hen gjorde) inför inloggning. */
export function saveResume(path: string, data?: unknown) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, data: data ?? null, savedAt: Date.now() } satisfies ResumeRecord));
  } catch {
    /* ignore */
  }
}

/** Vägen användaren ska tillbaka till — null om hen redan skickats dit. */
export function peekResumePath(): string | null {
  const record = read();
  if (!record || record.redirected) return null;
  return record.path;
}

/** Markerar att återhoppet är gjort; verktygstillståndet ligger kvar tills sidan läser det. */
export function markResumeRedirected() {
  const record = read();
  if (!record) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...record, redirected: true } satisfies ResumeRecord));
  } catch {
    /* ignore */
  }
}

/**
 * Hämtar och raderar sparat verktygstillstånd för `path`.
 * Returnerar null om posten gäller en annan sida, är för gammal eller saknas.
 */
export function takeResumeData<T>(path: string): T | null {
  const record = read();
  if (!record) return null;
  const recordPath = record.path.split("?")[0].split("#")[0];
  if (recordPath !== path) return null;
  clearResume();
  return (record.data ?? null) as T | null;
}

/**
 * Anropas från varje inloggningsingång. Ger verktyget på sidan en chans att
 * spara sitt arbete och ser till att återhoppsvägen finns även om verktyget
 * inte sparade något.
 */
export function prepareLoginResume(path: string) {
  if (typeof window === "undefined") return;
  clearResume();
  window.dispatchEvent(new Event(BEFORE_LOGIN_EVENT));
  if (!peekResumePath()) saveResume(path);
}

export function clearResume() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
