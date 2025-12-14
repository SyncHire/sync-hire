"use client";

/**
 * Reset Password Page
 *
 * Handle password reset from email link.
 * Requires valid token from URL params.
 */

import { useState, Suspense } from "react";
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
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle } from "lucide-react";

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;

  if (password.length >= 8) {
    score += 25;
  }
  if (password.length >= 12) {
    score += 15;
  }
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 20;
  }
  if (/\d/.test(password)) {
    score += 20;
  }
  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 20;
  }

  if (score < 40) {
    return { score, label: "Weak", color: "bg-destructive" };
  }
  if (score < 70) {
    return { score, label: "Fair", color: "bg-yellow-500" };
  }
  if (score < 90) {
    return { score, label: "Good", color: "bg-primary" };
  }
  return { score, label: "Strong", color: "bg-green-500" };
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  // No token - show error
  if (!token) {
    return (
      <Card>
        <CardHeader className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
          <CardTitle>Invalid Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/forgot-password">
            <Button>Request New Link</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    const result = await authClient.resetPassword({
      newPassword: password,
      token: token ?? undefined,
    });

    if (result.error) {
      setError(
        result.error.message || "Failed to reset password. The link may have expired."
      );
      setIsLoading(false);
      return;
    }

    setIsSuccess(true);
    // Redirect to login after a short delay
    setTimeout(() => {
      router.push("/login");
    }, 3000);
  }

  if (isSuccess) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[200px]">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Password Reset!</h2>
          <p className="text-muted-foreground text-center mb-4">
            Your password has been reset successfully. Redirecting to login...
          </p>
          <Link href="/login">
            <Button>Go to Login</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
            />
            {password.length > 0 && (
              <div className="space-y-1">
                <Progress
                  value={passwordStrength.score}
                  className={`h-1 ${passwordStrength.color}`}
                />
                <p className="text-xs text-muted-foreground">
                  Password strength: {passwordStrength.label}
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Reset Password
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          Back to Login
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}
