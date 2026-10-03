import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { googleAuthEnabled } from "@/lib/env";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create workspace" };

export default async function SignupPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect("/dashboard");
  return <SignupForm googleEnabled={googleAuthEnabled} />;
}
