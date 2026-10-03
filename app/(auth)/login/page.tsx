import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { googleAuthEnabled } from "@/lib/env";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { LoginForm } from "@/components/auth/login-form";
import { AnalystIllustration } from "@/components/auth/analyst-illustration";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string; error?: string } }) {
  const callbackUrl = safeCallbackUrl(searchParams.callbackUrl);
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect(callbackUrl);
  return (
    <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2">
      <div className="flex justify-center">
        <LoginForm callbackUrl={callbackUrl} googleEnabled={googleAuthEnabled} oauthError={searchParams.error} />
      </div>
      <div className="hidden justify-center lg:flex">
        <AnalystIllustration className="h-auto w-full max-w-lg" />
      </div>
    </div>
  );
}
