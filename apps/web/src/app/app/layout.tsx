import { redirect } from "next/navigation";
import Link from "next/link";

import { auth, signOut } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const name = session.user.name ?? session.user.email ?? "Player";

  return (
    <div className="flex min-h-screen flex-col bg-wild-ink text-wild-parch">
      <header className="flex items-center justify-between border-b border-wild-parch/10 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/app" className="font-pixel text-xs uppercase tracking-[0.3em] text-wild-accent">
            Wildloom
          </Link>
          <nav className="flex gap-4 text-sm text-wild-parch/70">
            <Link href="/app" className="hover:text-wild-parch">Lobby</Link>
            <Link href="/app/dex" className="hover:text-wild-parch">Dex</Link>
            <Link href="/app/play" className="hover:text-wild-parch">Play</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-wild-parch/70">{name}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded border border-wild-parch/20 px-3 py-1 text-xs hover:bg-wild-parch/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
