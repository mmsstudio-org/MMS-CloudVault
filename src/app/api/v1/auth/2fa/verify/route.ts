import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyTotpCode, enableTwoFactor } from "@/lib/totp";

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

    await enableTwoFactor(session.user.email, secret);

    return NextResponse.json({
      success: true,
      message: "Two-Factor Authentication enabled successfully.",
    });
  } catch (err) {
    console.error("2FA verify error:", err);
    return NextResponse.json(
      { error: "Failed to verify 2FA code" },
      { status: 500 }
    );
  }
}
