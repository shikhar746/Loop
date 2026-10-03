"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Info, LogIn } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginSchema } from "@/lib/validators/auth";
import { reveal } from "@/lib/reveal";

const DEMO_ACCOUNTS = ["admin@loop.demo", "analyst@loop.demo", "viewer@loop.demo"];

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
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

  const rootError = form.formState.errors.root?.message;
  const r = [reveal(0), reveal(1), reveal(2)];

  return (
    <div className="w-full max-w-md space-y-5">
      <Card className={r[0].className} style={r[0].style}>
        <CardHeader className="space-y-2">
          <p className="eyebrow">Welcome back</p>
          <CardTitle className="display-wonk text-4xl font-black">Sign in</CardTitle>
          <CardDescription>Pick up where your customers left off.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <CardContent className="space-y-4">
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

      <aside
        aria-label="Demo accounts"
        className={`surface flex gap-3 p-4 text-sm ${r[1].className}`}
        style={r[1].style}
      >
        <Info className="mt-0.5 size-4 shrink-0 text-lavender" aria-hidden="true" />
        <div className="space-y-1.5">
          <p className="font-medium">Demo accounts</p>
          <ul className="space-y-0.5 font-mono text-xs text-muted-foreground">
            {DEMO_ACCOUNTS.map((email) => (
              <li key={email}>{email}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Password in README.</p>
        </div>
      </aside>
    </div>
  );
}
