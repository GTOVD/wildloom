import Link from "next/link";

import { auth } from "@/lib/auth";

export default async function LandingPage() {
  const session = await auth();
  const signedIn = !!session?.user;

  return (
    <main className="min-h-screen bg-gradient-to-b from-wild-ink via-[#1a1230] to-wild-ink">
      <div className="mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center">
        <p className="font-pixel text-xs uppercase tracking-[0.4em] text-wild-accent">
          Multiplayer creature-battle
        </p>
        <h1 className="mt-4 text-6xl font-extrabold tracking-tight text-wild-parch sm:text-7xl">
          Wildloom
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-wild-parch/80">
          A real-time, browser-native creature-battle game built on continuous
          physics. Procedural creatures, dynamic moves you compose yourself, and
          battles resolved by smooth, stress-response equations rather than
          tables.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {signedIn ? (
            <Link
              href="/app"
              className="rounded-lg bg-wild-flora px-8 py-3 text-base font-semibold text-wild-ink shadow-lg transition hover:bg-wild-flora/90"
            >
              Enter the lobby
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-wild-flora px-8 py-3 text-base font-semibold text-wild-ink shadow-lg transition hover:bg-wild-flora/90"
            >
              Sign in to play
            </Link>
          )}
          <Link
            href="https://github.com/GTOVD/wildloom"
            className="rounded-lg border border-wild-parch/30 px-8 py-3 text-base font-semibold text-wild-parch hover:bg-wild-parch/10"
          >
            View source
          </Link>
        </div>

        <div className="mt-20 grid w-full grid-cols-1 gap-6 text-left sm:grid-cols-3">
          <FeatureCard
            title="Procedural identity"
            body="No two creatures are the same. Stats, materials, and affinity emphasis roll from biome-shaped distributions at spawn."
          />
          <FeatureCard
            title="Compose your moves"
            body="Pick a frame and tune it. Affinity, payload split, modality routing, status riders — every move is yours."
          />
          <FeatureCard
            title="Continuous physics"
            body="Damage is stress applied to material over time, shaped by accumulator state and affinity field alignment. No tables."
          />
        </div>
      </div>
      <footer className="border-t border-wild-parch/10 py-6 text-center text-xs text-wild-parch/40">
        Wildloom is original work, not affiliated with any monster-collecting franchise.
      </footer>
    </main>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-wild-parch/15 bg-wild-parch/5 p-6">
      <h3 className="font-pixel text-xs uppercase tracking-widest text-wild-accent">
        {title}
      </h3>
      <p className="mt-3 text-sm text-wild-parch/85">{body}</p>
    </div>
  );
}
