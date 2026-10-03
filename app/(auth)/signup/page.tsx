import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { googleAuthEnabled } from "@/lib/env";
import { SignupForm } from "@/components/auth/signup-form";
import { AnalystIllustration } from "@/components/auth/analyst-illustration";

export const metadata: Metadata = { title: "Create workspace" };

export default async function SignupPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect("/dashboard");
  return (
    <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2">
      <div className="flex justify-center">
        <SignupForm googleEnabled={googleAuthEnabled} />
      </div>
      <div className="hidden justify-center lg:flex">
        <AnalystIllustration className="h-auto w-full max-w-lg" />
      </div>
    </div>
  );
}
