import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string } }) {
  const callbackUrl = safeCallbackUrl(searchParams.callbackUrl);
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect(callbackUrl);
  return <LoginForm callbackUrl={callbackUrl} />;
}
