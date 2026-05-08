// Auth.js v5 configuration with Google provider + a dev-mode credentials bypass.
// The credentials bypass is only registered when `AUTH_DEV_BYPASS=1` and we're
// not in production (env.ts enforces the production guard).

import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@wildloom/db";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { env, hasGoogleOAuth } from "./env";

const providers: NextAuthConfig["providers"] = [];

if (hasGoogleOAuth) {
  providers.push(
    Google({
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
      allowDangerousEmailAccountLinking: false,
    }),
  );
}

if (env.authDevBypass) {
  providers.push(
    Credentials({
      id: "dev-bypass",
      name: "Dev Bypass",
      credentials: {},
      async authorize() {
        // Idempotent upsert of the synthetic dev user.
        const user = await prisma.user.upsert({
          where: { email: env.authDevUserEmail },
          create: {
            email: env.authDevUserEmail,
            displayName: env.authDevUserName,
          },
          update: { lastSeen: new Date() },
        });
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.displayName,
        };
      },
    }),
  );
}

export const authConfig: NextAuthConfig = {
  // Adapter requires the `Credentials` provider to use JWT sessions, otherwise
  // session cookies don't persist for credential logins.
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: env.authDevBypass || !hasGoogleOAuth ? "jwt" : "database",
  },
  secret: env.authSecret,
  trustHost: true,
  providers,
  callbacks: {
    async session({ session, token, user }) {
      const userId = user?.id ?? (typeof token?.sub === "string" ? token.sub : undefined);
      if (session.user && userId) {
        (session.user as { id?: string }).id = userId;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
};

// NOTE: NextAuth's destructured exports infer types from internal modules in
// ways that confuse TS in a workspace setup. Wrapping the call avoids the
// "cannot be named without a reference to..." errors.
const nextAuthInstance = NextAuth(authConfig);

export const handlers = nextAuthInstance.handlers;
export const auth: typeof nextAuthInstance.auth = nextAuthInstance.auth;
export const signIn: typeof nextAuthInstance.signIn = nextAuthInstance.signIn;
export const signOut: typeof nextAuthInstance.signOut = nextAuthInstance.signOut;
