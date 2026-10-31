import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  verifyTotpCode,
  getUserTotpSecret,
  create2FaSessionToken,
  verifyAndConsumeRecoveryCode,
  TWO_FACTOR_COOKIE_NAME,
} from "@/lib/totp";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Authentication session required. Please sign in first." },
      { status: 401 }
    );
  }

  try {
    const { code, isBackupCode } = await req.json();
    const cleanCode = typeof code === "string" ? code.trim() : "";

    if (!cleanCode) {
      return NextResponse.json(
        { error: "Verification code is required." },
        { status: 400 }
      );
    }

    if (isBackupCode) {
      // Single-use backup recovery code verification
      const isValidBackup = await verifyAndConsumeRecoveryCode(
        session.user.email,
        cleanCode
      );

      if (!isValidBackup) {
        return NextResponse.json(
          {
            error:
              "Invalid backup recovery code or code has already been used. Please check your backup codes.",
          },
          { status: 400 }
        );
      }
    } else {
      // 6-digit TOTP verification
      if (cleanCode.length !== 6) {
        return NextResponse.json(
          { error: "Please enter a valid 6-digit verification code." },
          { status: 400 }
        );
      }

      const secret = await getUserTotpSecret(session.user.email);
      if (!secret) {
        return NextResponse.json(
          { error: "Two-Factor Authentication is not active for this account." },
          { status: 400 }
        );
      }

      const isValid = verifyTotpCode(secret, cleanCode);
      if (!isValid) {
        return NextResponse.json(
          {
            error:
              "Invalid 6-digit verification code. Please check your Google Authenticator app and try again.",
          },
          { status: 400 }
        );
      }
    }

    // Generate signed 2FA session token
    const token = await create2FaSessionToken(session.user.email);

    const response = NextResponse.json({
      success: true,
      message: isBackupCode
        ? "Backup recovery code verified successfully. Code has been consumed."
        : "Two-Factor Authentication verified successfully.",
    });

    response.cookies.set({
      name: TWO_FACTOR_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err) {
    console.error("[2FA Login Verify Error]:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during verification." },
      { status: 500 }
    );
  }
}
