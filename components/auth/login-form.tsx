"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, LogIn } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginSchema } from "@/lib/validators/auth";
import { reveal } from "@/lib/reveal";
import { AuthDivider, GoogleButton, oauthErrorMessage } from "./google-button";

export function LoginForm({
  callbackUrl,
  googleEnabled,
  oauthError,
}: {
  callbackUrl: string;
  googleEnabled: boolean;
  oauthError?: string;
}) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: { email: string; password: string }) {
    form.clearErrors("root");
    const res = await signIn("credentials", { redirect: false, email: values.email, password: values.password });
    if (!res || res.error) {
      form.setError("root", {
        message: res?.error === "CredentialsSignin" || res?.status === 401
          ? "That email and password don't match an account."
          : "We couldn't sign you in right now. Please try again.",
      });
      return;
    }
    router.replace(callbackUrl);
    router.refresh();
  }

  const rootError = form.formState.errors.root?.message ?? (form.formState.isSubmitted ? undefined : oauthErrorMessage(oauthError));
  const r = reveal(0);

  return (
    <div className="w-full max-w-md space-y-5">
      <Card className={r.className} style={r.style}>
        <CardHeader className="space-y-2">
          <p className="eyebrow">Welcome back</p>
          <CardTitle className="display-wonk text-4xl font-black">Sign in</CardTitle>
          <CardDescription>Pick up where your customers left off.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <CardContent className="space-y-4">
              {googleEnabled && (
                <>
                  <GoogleButton callbackUrl={callbackUrl} />
                  <AuthDivider />
                </>
              )}
              {rootError && (
                <Alert variant="destructive" aria-live="assertive">
                  <CircleAlert className="size-4" aria-hidden="true" />
                  <AlertDescription>{rootError}</AlertDescription>
                </Alert>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" placeholder="you@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-3">
              <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
                {!form.formState.isSubmitting && <LogIn aria-hidden="true" />}
                Sign in
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                New to LOOP?{" "}
                <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
                  Create a workspace
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
