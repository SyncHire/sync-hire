"use client";

/**
 * Main Header Component
 *
 * Reusable header for authenticated app pages.
 * Shows navigation based on the current view (candidate or HR).
 */

import { CircleHelp, Home, LogOut, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { signOut } from "@/lib/auth-client";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { AboutDialog } from "./AboutDialog";
import { ContextSwitcher } from "./ContextSwitcher";
import { Logo } from "./Logo";
import { NotificationInbox } from "./NotificationInbox";
import { QuotaUsageIndicator } from "./QuotaUsageIndicator";

export type AppView = "candidate" | "hr";

interface MainHeaderProps {
  view: AppView;
}

export function MainHeader({ view }: MainHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data: userData } = useCurrentUser();
  const user = userData?.data;

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    router.push("/login");
  }

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  useEffect(() => {
    setMounted(true);
  }, []);

  const isHRView = view === "hr";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md transition-colors duration-300">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Logo size="sm" />

          {user && <ContextSwitcher />}

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            {isHRView ? (
              <>
                <Link
                  href="/hr/jobs"
                  className={`hover:text-foreground transition-colors ${pathname.startsWith("/hr/jobs") ? "text-foreground" : ""}`}
                >
                  Jobs
                </Link>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-not-allowed text-muted-foreground/50">
                        Analytics
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Coming Soon</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            ) : (
              <>
                <Link
                  href="/candidate/jobs"
                  className={`hover:text-foreground transition-colors ${pathname.startsWith("/candidate/jobs") ? "text-foreground" : ""}`}
                >
                  Find Jobs
                </Link>
                <Link
                  href="/candidate/history"
                  className={`hover:text-foreground transition-colors ${pathname.startsWith("/candidate/history") ? "text-foreground" : ""}`}
                >
                  Interview History
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isHRView && <QuotaUsageIndicator />}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setShowAbout(true)}
          >
            <CircleHelp className="h-4 w-4" />
          </Button>

          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          )}

          <AboutDialog open={showAbout} onOpenChange={setShowAbout} />

          {user ? (
            <>
              <NotificationInbox subscriberId={user.id} />

              <div className="h-4 w-px bg-border/50" />

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-7 w-7 rounded-full overflow-hidden border border-border/50 bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-medium">{userInitials}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-0">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <div className="p-2">
                    <Link
                      href="/home"
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded transition-colors"
                    >
                      <Home className="h-4 w-4" />
                      Homepage
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4" />
                      {isSigningOut ? "Signing out..." : "Sign out"}
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
