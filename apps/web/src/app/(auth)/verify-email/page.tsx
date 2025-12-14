"use client";

/**
 * Verify Email Page
 *
 * Handles email verification:
 * - Shows success/pending state based on token verification
 * - Provides resend verification email functionality
 */

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2, Mail, AlertCircle } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [status, setStatus] = useState<
    "verifying" | "success" | "error" | "pending"
  >(token ? "verifying" : "pending");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(emailParam || "");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  async function verifyEmail(verificationToken: string) {
    setStatus("verifying");
    setError(null);

    const result = await authClient.verifyEmail({
      query: { token: verificationToken },
    });

    if (result.error) {
      setStatus("error");
      setError(result.error.message || "Verification failed. The link may have expired.");
      return;
    }

    setStatus("success");
    // Redirect to login after a short delay
    setTimeout(() => {
      router.push("/login");
    }, 3000);
  }

  async function handleResendVerification(e: React.FormEvent) {
    e.preventDefault();
    setIsResending(true);
    setResendSuccess(false);
    setError(null);

    const result = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/verify-email",
    });

    if (result.error) {
      setError(result.error.message || "Failed to resend verification email");
      setIsResending(false);
      return;
    }

    setResendSuccess(true);
    setIsResending(false);
  }

  // Verifying state
  if (status === "verifying") {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[200px]">
          <Spinner className="h-8 w-8 mb-4" />
          <p className="text-muted-foreground">Verifying your email...</p>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[200px]">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Email Verified!</h2>
          <p className="text-muted-foreground text-center mb-4">
            Your email has been verified successfully. Redirecting to login...
          </p>
          <Link href="/login">
            <Button>Go to Login</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Error state (verification failed)
  if (status === "error") {
    return (
      <Card>
        <CardHeader className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
          <CardTitle>Verification Failed</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleResendVerification} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isResending}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isResending}
            >
              {isResending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Resend Verification Email
            </Button>
          </form>

          {resendSuccess && (
            <Alert>
              <AlertDescription>
                Verification email sent! Check your inbox.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Pending state (waiting for user to check email)
  return (
    <Card>
      <CardHeader className="text-center">
        <Mail className="h-12 w-12 text-primary mx-auto mb-2" />
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          {emailParam
            ? `We sent a verification link to ${emailParam}`
            : "We sent a verification link to your email address"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Click the link in the email to verify your account. If you don&apos;t
          see it, check your spam folder.
        </p>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Didn&apos;t receive the email?
            </span>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {resendSuccess && (
          <Alert>
            <AlertDescription>
              Verification email sent! Check your inbox.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleResendVerification} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resend-email">Email Address</Label>
            <Input
              id="resend-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isResending}
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={isResending}
          >
            {isResending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Resend Verification Email
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
          Back to Login
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[200px]">
            <Spinner className="h-8 w-8 mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
