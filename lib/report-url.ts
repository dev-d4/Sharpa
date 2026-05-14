// UTF-8 safe base64 helpers — btoa/atob only handle ASCII (0-255), so
// Swedish characters (Å Ä Ö) must be encoded via TextEncoder first.

export function encodePayload(obj: unknown): string {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function decodePayload(b64: string): unknown {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}
