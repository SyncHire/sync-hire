"use client";

/**
 * Main Header Component
 *
 * Reusable header for authenticated app pages.
 * Shows navigation based on the current view (candidate or HR).
 */

import { Bell, CircleHelp, Inbox, LogOut, Moon, Sun } from "lucide-react";
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
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { signOut } from "@/lib/auth-client";
import { AboutDialog } from "./AboutDialog";
import { ContextSwitcher } from "./ContextSwitcher";
import { Logo } from "./Logo";
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

  const { data: notificationsData, isLoading: notificationsLoading } =
    useNotifications({ enabled: !!user });
  const notifications = notificationsData?.data ?? [];

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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
                  >
                    <Bell className="h-4 w-4" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                        {notifications.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="border-b border-border px-4 py-3">
                    <h4 className="text-sm font-semibold">Notifications</h4>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Loading...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Inbox className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="px-4 py-3 hover:bg-muted/50 transition-colors"
                          >
                            <p className="text-sm font-medium">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {notification.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="h-4 w-px bg-border/50" />

              <Popover>
                  <PopoverTrigger asChild>
                    <button className="h-7 w-7 rounded-full overflow-hidden border border-border/50 bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors cursor-pointer">
                      <span className="text-xs font-medium">{userInitials}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-0">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="p-2">
                      <button
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
