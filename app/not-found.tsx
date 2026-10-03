import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/app/wordmark";

export default function NotFound() {
  return (
    <main className="bg-atmosphere flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Wordmark size="lg" />
      <p className="font-mono text-sm text-primary">404</p>
      <h1 className="display-wonk max-w-xl font-display text-4xl font-black leading-tight sm:text-5xl">
        This page fell out of the loop.
      </h1>
      <p className="max-w-md text-muted-foreground">
        It doesn&apos;t exist, or it belongs to a workspace you&apos;re not part of.
      </p>
      <Button asChild>
        <Link href="/dashboard">
          <ArrowLeft aria-hidden="true" />
          Back to the dashboard
        </Link>
      </Button>
    </main>
  );
}
