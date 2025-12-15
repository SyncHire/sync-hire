"use client";

/**
 * Create Organization Page
 *
 * Minimal form to create a new organization.
 * Auto-generates slug from name.
 * Sets new org as active and redirects to HR dashboard.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { organization, useSession } from "@/lib/auth-client";
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
import { Building2 } from "lucide-react";
import { slugify } from "@/lib/utils/slugify";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const slug = slugify(name);

  useEffect(() => {
    if (!sessionPending && !session) {
      router.push("/login?callbackUrl=/create-organization");
    }
  }, [session, sessionPending, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Organization name is required");
      return;
    }

    if (!slug) {
      setError("Please enter a valid organization name");
      return;
    }

    setIsLoading(true);

    const result = await organization.create({
      name: name.trim(),
      slug,
    });

    if (result.error) {
      const errorMessage = result.error.message || "Failed to create organization";
      if (errorMessage.toLowerCase().includes("slug")) {
        setError("An organization with this name already exists. Please choose a different name.");
      } else {
        setError(errorMessage);
      }
      setIsLoading(false);
      return;
    }

    // Invalidate organizations list cache so dropdowns update
    await queryClient.invalidateQueries({ queryKey: ["organizations", "list"] });

    // Set the new org as active
    if (result.data?.id) {
      const setActiveResult = await organization.setActive({
        organizationId: result.data.id,
      });

      if (setActiveResult.error) {
        // Org created but couldn't set active - redirect to selection
        router.push("/select-organization");
        return;
      }
    }

    // Redirect to HR jobs page
    router.push("/hr/jobs");
  }

  if (sessionPending) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[200px]">
          <Spinner className="h-8 w-8 mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <Building2 className="h-12 w-12 text-primary mx-auto mb-2" />
        <CardTitle className="text-2xl">Create Organization</CardTitle>
        <CardDescription>
          Set up your company to start posting jobs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              autoFocus
            />
            {slug && (
              <p className="text-xs text-muted-foreground">
                URL: synchire.com/org/<span className="font-mono">{slug}</span>
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !name.trim()}>
            {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Create Organization
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground text-center">
          You can add more details like logo and description later in settings.
        </p>
        <Link
          href="/candidate/jobs"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          Skip for now - I want to find a job
        </Link>
      </CardFooter>
    </Card>
  );
}
