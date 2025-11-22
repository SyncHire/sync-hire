"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Video, Bell, Search, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering conditional content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute these values but only use them after mount to avoid hydration mismatch
  const isCandidate = pathname.startsWith('/candidate') || pathname.startsWith('/interview');
  // Only match /interview/[id], not deeper paths like /interview/[id]/results
  const pathParts = pathname.split('/').filter(Boolean);
  const isInterview = pathParts[0] === 'interview' && pathParts.length === 2;

  // During SSR and initial hydration, render a neutral state
  // After mount, render the correct conditional layout
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">
        <main className="h-screen overflow-hidden">
          {children}
        </main>
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
              <Link href="/" className="flex items-center gap-2 font-medium tracking-tight group">
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
                      className={`hover:text-foreground transition-colors ${pathname.startsWith('/hr/jobs') ? 'text-foreground' : ''}`}
                    >
                      Jobs
                    </Link>
                    <Link
                      href="/hr/applicants"
                      className={`hover:text-foreground transition-colors ${pathname.startsWith('/hr/applicants') ? 'text-foreground' : ''}`}
                    >
                      Candidates
                    </Link>
                    <Link
                      href="/hr/analytics"
                      className="hover:text-foreground transition-colors"
                    >
                      Analytics
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/candidate/jobs"
                      className={`hover:text-foreground transition-colors ${pathname.startsWith('/candidate/jobs') ? 'text-foreground' : ''}`}
                    >
                      Find Jobs
                    </Link>
                    <Link
                      href="/candidate/history"
                      className={`hover:text-foreground transition-colors ${pathname.startsWith('/candidate/history') ? 'text-foreground' : ''}`}
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
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
              </Button>

              <div className="h-4 w-px bg-border/50" />

              <div className="flex items-center gap-3">
                <Link
                  href={isCandidate ? "/hr/jobs" : "/candidate/jobs"}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 hover:bg-secondary rounded"
                >
                  {isCandidate ? 'Switch to HR' : 'Switch to Candidate'}
                </Link>
                <div className="h-7 w-7 rounded-full overflow-hidden border border-border/50 bg-secondary flex items-center justify-center">
                  <span className="text-xs font-medium">U</span>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}
      <main className={`${isInterview ? 'h-screen overflow-hidden' : 'container mx-auto px-4 py-8'}`}>
        {children}
      </main>
    </div>
  );
}
