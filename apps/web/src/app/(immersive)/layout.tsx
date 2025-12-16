/**
 * Immersive Layout
 *
 * Full-screen layout without header for immersive experiences.
 * Used for interview sessions.
 */

export default function ImmersiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">
      {children}
    </div>
  );
}
