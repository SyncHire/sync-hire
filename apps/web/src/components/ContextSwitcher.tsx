"use client";

/**
 * Context Switcher Component
 *
 * Allows users to switch between candidate and employer modes.
 * - Users without orgs see a "Post a Job" link
 * - Users with orgs see a dropdown to switch between personal/org views
 */

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Building2, ChevronDown, Plus, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import {
  useUserOrganizations,
  useSetActiveOrganization,
  useActiveOrganization,
} from "@/lib/hooks/use-organizations";

export function ContextSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: orgs, isLoading: orgsLoading } = useUserOrganizations();
  const { data: activeOrg } = useActiveOrganization();
  const setActiveOrg = useSetActiveOrganization();

  const isCandidate = pathname.startsWith("/candidate") || pathname.startsWith("/interview");
  const hasOrganizations = orgs && orgs.length > 0;

  // Still loading organizations
  if (orgsLoading) {
    return (
      <div className="flex items-center gap-2 px-2 py-1">
        <Spinner className="h-3 w-3" />
      </div>
    );
  }

  // User has no organizations - show "Post a Job" link
  if (!hasOrganizations) {
    return (
      <Link
        href="/create-organization"
        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 hover:bg-secondary rounded flex items-center gap-1"
      >
        <Building2 className="h-3 w-3" />
        Post a Job
      </Link>
    );
  }

  // User has organizations - show dropdown
  const currentLabel = isCandidate
    ? "Personal"
    : activeOrg?.name || "Select Organization";

  async function handleSwitchToPersonal() {
    router.push("/candidate/jobs");
  }

  async function handleSwitchToOrg(orgId: string) {
    await setActiveOrg.mutateAsync({ organizationId: orgId });
    router.push("/hr/jobs");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {isCandidate ? (
            <User className="h-3 w-3" />
          ) : (
            <Building2 className="h-3 w-3" />
          )}
          {currentLabel}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Switch View
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Personal / Candidate view */}
        <DropdownMenuItem
          onClick={handleSwitchToPersonal}
          className="cursor-pointer"
        >
          <User className="h-4 w-4 mr-2" />
          <span className="flex-1">Personal</span>
          {isCandidate && (
            <span className="ml-auto text-xs text-primary">Active</span>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Organization list */}
        {orgs?.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitchToOrg(org.id)}
            className="cursor-pointer"
            disabled={setActiveOrg.isPending}
          >
            <Building2 className="h-4 w-4 mr-2" />
            <span className="flex-1 truncate">{org.name}</span>
            {!isCandidate && activeOrg?.id === org.id && (
              <span className="ml-auto text-xs text-primary">Active</span>
            )}
          </DropdownMenuItem>
        ))}

        {/* Settings link - only show when in org view */}
        {!isCandidate && activeOrg && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/hr/settings" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Organization Settings
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        {/* Create new organization */}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/create-organization" className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
