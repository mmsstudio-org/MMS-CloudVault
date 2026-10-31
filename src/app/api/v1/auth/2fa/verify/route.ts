import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  verifyTotpCode,
  enableTwoFactor,
  create2FaSessionToken,
  TWO_FACTOR_COOKIE_NAME,
} from "@/lib/totp";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { secret, token } = await req.json();

    if (!secret || !token) {
      return NextResponse.json(
        { error: "Secret and 6-digit token are required" },
        { status: 400 }
      );
    }

    const isValid = verifyTotpCode(secret, token);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid 6-digit verification code. Please try again." },
        { status: 400 }
      );
    }

    const result = await enableTwoFactor(session.user.email, secret);

    // Issue active 2FA session token so current session remains authenticated
    const sessionToken = await create2FaSessionToken(session.user.email);

    const response = NextResponse.json({
      success: true,
      message: "Two-Factor Authentication enabled successfully.",
      recoveryCodes: result.recoveryCodes,
    });

    response.cookies.set({
      name: TWO_FACTOR_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err) {
    console.error("2FA verify error:", err);
    return NextResponse.json(
      { error: "Failed to verify 2FA code" },
      { status: 500 }
    );
  }
}
