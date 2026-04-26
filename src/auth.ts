import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/db/mongodb";
import { authConfig } from "@/auth.config";

/* ── Login rate limiting (in-memory) ────────────────────────── */
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const loginAttempts = new Map<string, { count: number; windowStart: number }>();

function trackFailedLogin(email: string, now: number) {
  const record = loginAttempts.get(email);
  if (!record || now - record.windowStart > LOGIN_WINDOW_MS) {
    loginAttempts.set(email, { count: 1, windowStart: now });
  } else {
    record.count++;
  }
}

// Cleanup stale entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts) {
    if (now - record.windowStart > LOGIN_WINDOW_MS) {
      loginAttempts.delete(key);
    }
  }
}, 30 * 60 * 1000).unref?.();

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },
  providers: [
    Google({ allowDangerousEmailAccountLinking: true }),
    GitHub({ allowDangerousEmailAccountLinking: true }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        // Rate limit: max 5 attempts per email per 15 minutes
        const now = Date.now();
        const key = email.toLowerCase();
        const record = loginAttempts.get(key);
        if (record) {
          // Clean up expired window
          if (now - record.windowStart > LOGIN_WINDOW_MS) {
            loginAttempts.delete(key);
          } else if (record.count >= LOGIN_MAX_ATTEMPTS) {
            // Too many attempts — reject without checking password
            return null;
          }
        }

        const client = await clientPromise;
        const db = client.db();
        const user = await db.collection("users").findOne({ email });

        if (!user || !user.hashedPassword) {
          trackFailedLogin(key, now);
          return null;
        }

        const isValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isValid) {
          trackFailedLogin(key, now);
          return null;
        }

        // Success — clear attempts
        loginAttempts.delete(key);

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image ?? null,
        };
      },
    }),
  ],
  events: {
    async createUser({ user }) {
      // Send welcome email to new OAuth users (non-fatal)
      if (user.email) {
        try {
          const { sendWelcomeEmail } = await import("@/lib/email/welcome");
          await sendWelcomeEmail(user.email, user.name ?? "there");
        } catch (err) {
          console.error("Welcome email failed for OAuth user:", err);
        }
      }
    },
  },
  callbacks: {
    jwt({ token, user, account }) {
      if (user?.id) {
        token.id = user.id;
      }
      if (account?.provider) {
        token.provider = account.provider;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
