// Egna formaterare i stället för Intl/toLocaleString: headless Chrome ger
// ibland non-breaking space som tusenavskiljare, vilket syns som en tom ruta i
// vissa typsnittsfallbacks. Vi vill ha exakt samma glyf i varje bildruta.

const THIN_SPACE = " ";

export function formatKr(value: number): string {
  const rounded = Math.round(Math.abs(value));
  const sign = value < 0 ? "−" : ""; // äkta minustecken, inte bindestreck
  const digits = String(rounded);
  let grouped = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) grouped += THIN_SPACE;
    grouped += digits[i];
  }
  return `${sign}${grouped}${THIN_SPACE}kr`;
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals).replace(".", ",")}${THIN_SPACE}%`;
}
