import Link from "next/link";

import { env, hasGoogleOAuth } from "@/lib/env";

import { GoogleSignInButton, DevBypassButton } from "./buttons";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-wild-ink px-6">
      <div className="w-full max-w-md rounded-2xl border border-wild-parch/15 bg-[#15102a] p-8 shadow-2xl">
        <h1 className="font-pixel text-sm uppercase tracking-[0.3em] text-wild-accent">
          Sign in
        </h1>
        <h2 className="mt-2 text-3xl font-bold text-wild-parch">Wildloom</h2>
        <p className="mt-2 text-sm text-wild-parch/70">
          One sign-in option below. We do not store passwords.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {hasGoogleOAuth ? (
            <GoogleSignInButton />
          ) : (
            <p className="rounded-md border border-wild-parch/15 bg-wild-parch/5 p-3 text-xs text-wild-parch/70">
              Google OAuth is not configured for this build. Set
              <code className="mx-1 text-wild-accent">GOOGLE_CLIENT_ID</code>
              and
              <code className="mx-1 text-wild-accent">GOOGLE_CLIENT_SECRET</code>
              in your <code className="text-wild-accent">.env</code>.
            </p>
          )}

          {env.authDevBypass ? (
            <>
              <div className="my-2 flex items-center gap-3 text-xs text-wild-parch/40">
                <div className="h-px flex-1 bg-wild-parch/15" />
                or
                <div className="h-px flex-1 bg-wild-parch/15" />
              </div>
              <DevBypassButton />
              <p className="text-center text-[10px] text-wild-parch/40">
                Dev bypass is enabled (NODE_ENV ≠ production). Disable by
                unsetting <code>AUTH_DEV_BYPASS</code>.
              </p>
            </>
          ) : null}
        </div>

        <p className="mt-8 text-center text-xs text-wild-parch/40">
          <Link href="/" className="hover:text-wild-parch">
            ← Back to the landing page
          </Link>
        </p>
      </div>
    </main>
  );
}
