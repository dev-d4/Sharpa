import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.INTEGRATION_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Fel lösenord" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("integration_auth", expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 dagar
    path: "/",
  });
  return res;
}
