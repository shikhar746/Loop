"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signup, toApiError } from "@/lib/api-client";
import { applyApiErrors } from "@/lib/form-errors";
import { signupSchema, type SignupInput } from "@/lib/validators/auth";
import { reveal } from "@/lib/reveal";

export function SignupForm() {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", workspaceName: "" },
  });

  async function onSubmit(values: SignupInput) {
    form.clearErrors("root");
    try {
      await signup(values);
    } catch (err) {
      const e = toApiError(err);
      if (e.status === 409) {
        form.setError("email", { message: "This email is already registered. Try signing in instead." });
      } else {
        applyApiErrors(form, e);
      }
      return;
    }
    const res = await signIn("credentials", { redirect: false, email: values.email, password: values.password });
    if (!res || res.error) {
      router.replace("/login");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  const rootError = form.formState.errors.root?.message;
  const r = reveal(0);

  return (
    <Card className={`w-full max-w-md ${r.className}`} style={r.style}>
      <CardHeader className="space-y-2">
        <p className="eyebrow">Start a workspace</p>
        <CardTitle className="display-wonk text-4xl font-black">Create workspace</CardTitle>
        <CardDescription>You&apos;ll be its first admin. Invite your team from Settings.</CardDescription>
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your name</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work email</FormLabel>
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
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription>At least 8 characters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="workspaceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace name</FormLabel>
                  <FormControl>
                    <Input autoComplete="organization" placeholder="Acme Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
              Create workspace
              {!form.formState.isSubmitting && <ArrowRight aria-hidden="true" />}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
