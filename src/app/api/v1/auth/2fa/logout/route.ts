import { NextResponse } from "next/server";
import { TWO_FACTOR_COOKIE_NAME } from "@/lib/totp";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(TWO_FACTOR_COOKIE_NAME);
  return response;
}
