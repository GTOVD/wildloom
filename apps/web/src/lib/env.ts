// Centralized env-var access. Refuses dev bypass in production.

const isProduction = process.env.NODE_ENV === "production";

function bool(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

const devBypassRequested = bool(process.env.AUTH_DEV_BYPASS);

if (isProduction && devBypassRequested) {
  throw new Error(
    "AUTH_DEV_BYPASS=1 is not permitted when NODE_ENV=production. Refusing to start.",
  );
}

export const env = {
  isProduction,
  authDevBypass: !isProduction && devBypassRequested,
  authDevUserEmail: process.env.AUTH_DEV_USER_EMAIL ?? "dev@wildloom.local",
  authDevUserName: process.env.AUTH_DEV_USER_NAME ?? "Dev Player",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  authSecret: process.env.AUTH_SECRET ?? "dev-only-secret-please-change",
  databaseUrl: process.env.DATABASE_URL ?? "",
  colyseusUrl:
    process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export const hasGoogleOAuth = !!(
  env.googleClientId && env.googleClientSecret
);
