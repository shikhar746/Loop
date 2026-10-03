import Link from "next/link";
import { AppBackground } from "@/components/app/app-background";
import { Wordmark } from "@/components/app/wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <AppBackground />
      <header className="mx-auto flex w-full max-w-6xl items-center px-4 py-6 sm:px-8">
        <Link href="/" className="rounded-md" aria-label="LOOP home">
          <Wordmark />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">{children}</main>
    </div>
  );
}
