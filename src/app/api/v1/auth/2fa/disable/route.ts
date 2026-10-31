import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { disableTwoFactor, TWO_FACTOR_COOKIE_NAME } from "@/lib/totp";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await disableTwoFactor(session.user.email);
    const response = NextResponse.json({
      success: true,
      message: "Two-Factor Authentication disabled successfully.",
    });
    response.cookies.delete(TWO_FACTOR_COOKIE_NAME);
    return response;
  } catch (err) {
    console.error("[2FA Disable Error]:", err);
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 }
    );
  }
}
