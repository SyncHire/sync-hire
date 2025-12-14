"use client";

/**
 * Select Organization Page
 *
 * List user's organizations and allow selection.
 * Sets active organization for the session.
 * Auto-selects if user has only one org.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { organization, useSession } from "@/lib/auth-client";
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
import { Building2, ChevronRight } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

export default function SelectOrganizationPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrganizations() {
      const result = await organization.list();

      if (result.error) {
        setError("Failed to load organizations");
        setIsLoading(false);
        return;
      }

      const orgs = result.data || [];

      // No orgs = candidate user, redirect to candidate jobs
      if (orgs.length === 0) {
        router.push("/candidate/jobs");
        return;
      }

      // Auto-select if user has only one organization
      if (orgs.length === 1) {
        selectOrganization(orgs[0].id);
        return;
      }

      // Multiple orgs - show selection UI
      setOrganizations(orgs);
      setIsLoading(false);
    }

    if (!sessionPending && session) {
      loadOrganizations();
    }
  }, [session, sessionPending, router]);

  async function selectOrganization(orgId: string) {
    setSelectingId(orgId);
    setError(null);

    const result = await organization.setActive({ organizationId: orgId });

    if (result.error) {
      setError("Failed to select organization");
      setSelectingId(null);
      return;
    }

    // Redirect to HR jobs page
    router.push("/hr/jobs");
  }

  if (sessionPending || isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[200px]">
          <Spinner className="h-8 w-8 mb-4" />
          <p className="text-muted-foreground">Loading organizations...</p>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <Building2 className="h-12 w-12 text-primary mx-auto mb-2" />
        <CardTitle className="text-2xl">Select Organization</CardTitle>
        <CardDescription>
          Choose an organization to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => selectOrganization(org.id)}
              disabled={selectingId !== null}
              className="w-full flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {org.logo ? (
                    <img
                      src={org.logo}
                      alt={org.name}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <Building2 className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium">{org.name}</p>
                  <p className="text-sm text-muted-foreground">{org.slug}</p>
                </div>
              </div>
              {selectingId === org.id ? (
                <Spinner className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          Back to Home
        </Link>
      </CardFooter>
    </Card>
  );
}
