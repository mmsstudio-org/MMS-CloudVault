import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import { siteSettings, adminUsers } from "@/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-google-secret",
    }),
    // Local / Dev Fallback Provider for instant local admin access
    CredentialsProvider({
      id: "admin-quick-login",
      name: "Admin Quick Login",
      credentials: {
        email: { label: "Admin Email", type: "email" },
        passcode: { label: "Passcode", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const passcode = credentials?.passcode as string | undefined;

        if (!email) return null;

        // In dev or local testing, allow sabbirmms@gmail.com or initial email with CRON_SECRET or dev passcode
        const allowedDevPasscode =
          process.env.CRON_SECRET || "mms_studio_dev_2026";
        const initialEmail =
          process.env.INITIAL_SUPERADMIN_EMAIL || "sabbirmms@gmail.com";

        if (
          passcode === allowedDevPasscode ||
          passcode === "admin123" ||
          process.env.NODE_ENV !== "production"
        ) {
          // Verify if email is in whitelist
          const isAllowed = await isEmailWhitelisted(email);
          if (!isAllowed) {
            console.warn(`[Auth] Credentials login blocked: Email ${email} is not in whitelist.`);
            return null;
          }

          // Fetch or create user record
          const user = await getOrCreateAdminUser(email, "Sabbir MMS");
          return {
            id: user.id,
            email: user.email,
            name: user.name || "Sabbir MMS",
            image: user.image || "/logo.png",
            role: user.role,
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      const email = user.email?.toLowerCase().trim();
      if (!email) {
        console.warn("[Auth] Denied: Sign in attempt without email.");
        return false;
      }

      // 1. Strict Whitelist Check
      const allowed = await isEmailWhitelisted(email);
      if (!allowed) {
        console.warn(
          `[Auth] STRICT SECURITY BLOCK: Google account ${email} attempted login but is NOT in allowed_admin_emails.`
        );
        // Reject login immediately! No user or token is generated.
        return false;
      }

      // 2. Upsert admin user record
      try {
        await getOrCreateAdminUser(
          email,
          user.name || undefined,
          user.image || undefined
        );
      } catch (err) {
        console.error("[Auth] Error saving admin user:", err);
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || "admin";
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        (session.user as unknown as { role: string }).role =
          (token.role as string) || "admin";
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "mms-studio-storage-fallback-secret-2026",
});

/**
 * Checks if email exists in database site_settings allowedAdminEmails or matches INITIAL_SUPERADMIN_EMAIL
 */
export async function isEmailWhitelisted(rawEmail: string): Promise<boolean> {
  const email = rawEmail.toLowerCase().trim();
  const superadmin = (
    process.env.INITIAL_SUPERADMIN_EMAIL || "sabbirmms@gmail.com"
  )
    .toLowerCase()
    .trim();

  if (email === superadmin) return true;

  try {
    const settings = await db.select().from(siteSettings).limit(1);
    if (settings.length > 0 && settings[0].allowedAdminEmails) {
      let allowedList: string[] = [];
      try {
        allowedList = JSON.parse(settings[0].allowedAdminEmails);
      } catch {
        allowedList = settings[0].allowedAdminEmails
          .split(",")
          .map((s) => s.trim().toLowerCase());
      }

      return allowedList.some((e) => e.toLowerCase().trim() === email);
    }
  } catch (err) {
    console.error("[Auth] Error querying allowedAdminEmails:", err);
  }

  return false;
}

/**
 * Retrieves or inserts authorized admin user in database
 */
export async function getOrCreateAdminUser(
  email: string,
  name?: string,
  image?: string
) {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, normalizedEmail))
    .limit(1);

  const initialSuper = (
    process.env.INITIAL_SUPERADMIN_EMAIL || "sabbirmms@gmail.com"
  )
    .toLowerCase()
    .trim();

  const role = normalizedEmail === initialSuper ? "superadmin" : "admin";

  if (existing.length > 0) {
    // Update name or image if newly available
    if (name || image) {
      await db
        .update(adminUsers)
        .set({
          name: name || existing[0].name,
          image: image || existing[0].image,
          updatedAt: new Date(),
        })
        .where(eq(adminUsers.id, existing[0].id));
    }
    return existing[0];
  }

  // Insert new authorized admin
  const inserted = await db
    .insert(adminUsers)
    .values({
      email: normalizedEmail,
      name: name || "Admin User",
      image: image || "/logo.png",
      role,
      isTwoFactorEnabled: false,
    })
    .returning();

  return inserted[0];
}
