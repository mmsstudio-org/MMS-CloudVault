import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserRecoveryCodes,
  regenerateUserRecoveryCodes,
  isUserTwoFactorEnabled,
} from "@/lib/totp";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const isEnabled = await isUserTwoFactorEnabled(session.user.email);
    if (!isEnabled) {
      return NextResponse.json(
        { error: "Two-Factor Authentication is not active." },
        { status: 400 }
      );
    }

    const recoveryCodes = await getUserRecoveryCodes(session.user.email);
    return NextResponse.json({
      success: true,
      recoveryCodes,
      count: recoveryCodes.length,
    });
  } catch (err) {
    console.error("Error fetching recovery codes:", err);
    return NextResponse.json(
      { error: "Failed to retrieve recovery codes." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const isEnabled = await isUserTwoFactorEnabled(session.user.email);
    if (!isEnabled) {
      return NextResponse.json(
        { error: "Two-Factor Authentication is not active." },
        { status: 400 }
      );
    }

    const recoveryCodes = await regenerateUserRecoveryCodes(session.user.email);
    return NextResponse.json({
      success: true,
      message: "New recovery codes generated successfully.",
      recoveryCodes,
      count: recoveryCodes.length,
    });
  } catch (err) {
    console.error("Error regenerating recovery codes:", err);
    return NextResponse.json(
      { error: "Failed to regenerate recovery codes." },
      { status: 500 }
    );
  }
}
