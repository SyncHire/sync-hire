import { ExternalLink, Video } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GITHUB_REPO = "SyncHire/sync-hire";

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const commitSha = process.env.NEXT_PUBLIC_COMMIT_SHA || "dev";
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const shortSha = commitSha.slice(0, 7);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-foreground flex items-center justify-center text-background">
              <Video className="h-3 w-3" />
            </div>
            SyncHire
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            AI-powered interview platform for modern hiring teams.
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Build</span>
              {commitSha !== "dev" ? (
                <a
                  href={`https://github.com/${GITHUB_REPO}/commit/${commitSha}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs flex items-center gap-1 hover:underline"
                >
                  {shortSha}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="font-mono text-xs">{shortSha}</span>
              )}
            </div>

            {buildTime && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Built</span>
                <span className="text-xs">
                  {new Date(buildTime).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border text-xs text-muted-foreground">
            © {new Date().getFullYear()} SyncHire
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
