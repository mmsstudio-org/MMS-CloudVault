import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateTotpSetup } from "@/lib/totp";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const setup = await generateTotpSetup(session.user.email);
    return NextResponse.json(setup);
  } catch (err) {
    console.error("2FA setup error:", err);
    return NextResponse.json(
      { error: "Failed to generate 2FA setup" },
      { status: 500 }
    );
  }
}
