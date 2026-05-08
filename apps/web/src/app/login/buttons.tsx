"use client";

import { signIn } from "next-auth/react";

export function GoogleSignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/app" })}
      className="flex items-center justify-center gap-3 rounded-lg bg-wild-parch px-4 py-3 text-sm font-semibold text-wild-ink shadow transition hover:bg-wild-parch/90"
    >
      <GoogleGlyph />
      Continue with Google
    </button>
  );
}

export function DevBypassButton() {
  return (
    <button
      onClick={() => signIn("dev-bypass", { callbackUrl: "/app" })}
      className="rounded-lg border border-wild-flora bg-wild-flora/10 px-4 py-3 text-sm font-semibold text-wild-flora transition hover:bg-wild-flora/20"
    >
      Sign in as Dev Player (local)
    </button>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.79 2.72v2.26h2.9c1.7-1.56 2.69-3.87 2.69-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.06-3.72H.96v2.34A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.94 10.7A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.16.28-1.7V4.96H.96A8.997 8.997 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.98-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.43 1.34l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.43 2.02.96 4.96l2.98 2.34C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
