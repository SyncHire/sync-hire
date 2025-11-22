"use client";

import { Bell, Inbox, Moon, Search, Sun, Video } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { data: notificationsData, isLoading: notificationsLoading } =
    useNotifications();
  const notifications = notificationsData?.data ?? [];
  const { data: userData } = useCurrentUser();
  const user = userData?.data;

  // Get user initials from name
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  // Prevent hydration mismatch by only rendering conditional content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute these values but only use them after mount to avoid hydration mismatch
  const isCandidate =
    pathname.startsWith("/candidate") || pathname.startsWith("/interview");
  // Only match /interview/[id], not deeper paths like /interview/[id]/results
  const pathParts = pathname.split("/").filter(Boolean);
  const isInterview = pathParts[0] === "interview" && pathParts.length === 2;

  // During SSR and initial hydration, render a neutral state
  // After mount, render the correct conditional layout
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">
        <main className="h-screen overflow-hidden">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">
      {/* Hide header in immersive interview mode */}
      {!isInterview && (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md transition-colors duration-300">
          <div className="container mx-auto flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-8">
              <Link
                href="/"
                className="flex items-center gap-2 font-medium tracking-tight group"
              >
                <div className="h-6 w-6 rounded bg-foreground flex items-center justify-center text-background group-hover:scale-105 transition-transform">
                  <Video className="h-3 w-3" />
                </div>
                <span className="font-semibold">SyncHire</span>
              </Link>

              <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                {!isCandidate ? (
                  <>
                    <Link
                      href="/hr/jobs"
                      className={`hover:text-foreground transition-colors ${pathname.startsWith("/hr/jobs") ? "text-foreground" : ""}`}
                    >
                      Jobs
                    </Link>
                    <Link
                      href="/hr/applicants"
                      className={`hover:text-foreground transition-colors ${pathname.startsWith("/hr/applicants") ? "text-foreground" : ""}`}
                    >
                      Candidates
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
              <div className="relative hidden md:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  className="h-8 w-64 rounded-md bg-secondary/50 border border-border/50 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-border transition-colors"
                  placeholder="Search..."
                />
              </div>

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

              <div className="flex items-center gap-3">
                <Link
                  href={isCandidate ? "/hr/jobs" : "/candidate/jobs"}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 hover:bg-secondary rounded"
                >
                  {isCandidate ? "Switch to HR" : "Switch to Candidate"}
                </Link>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="h-7 w-7 rounded-full overflow-hidden border border-border/50 bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors cursor-pointer">
                      <span className="text-xs font-medium">{userInitials}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-0">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium">{user?.name ?? "User"}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">
                        Role: {user?.role === "CANDIDATE" ? "Candidate" : "Employer"}
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </header>
      )}
      <main
        className={`${isInterview ? "h-screen overflow-hidden" : "container mx-auto px-4 py-8"}`}
      >
        {children}
      </main>
    </div>
  );
}
