import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** Size variant for the logo */
  size?: "sm" | "md" | "lg";
  /** Whether to show the text "SyncHire" next to the icon */
  showText?: boolean;
  /** Whether the logo should link to home */
  asLink?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeMap = {
  sm: { icon: 18, text: "text-sm" },
  md: { icon: 24, text: "text-base" },
  lg: { icon: 32, text: "text-xl" },
} as const;

function LogoIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="logoGrad"
          x1="40"
          y1="0"
          x2="40"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>

      {/* S-shape: top arc */}
      <path
        d="M40 56 C18 56 10 38 10 30 C10 14 24 4 40 4 C52 4 62 10 68 20"
        stroke="url(#logoGrad)"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />

      {/* S-shape: bottom arc */}
      <path
        d="M40 44 C62 44 70 62 70 70 C70 86 56 96 40 96 C28 96 18 90 12 80"
        stroke="url(#logoGrad)"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />

      {/* Upper arrow */}
      <path
        d="M26 44 L18 36 L26 28 L26 36 L34 36 L34 44 Z"
        fill="url(#logoGrad)"
      />

      {/* Lower arrow */}
      <path
        d="M54 56 L62 64 L54 72 L54 64 L46 64 L46 56 Z"
        fill="url(#logoGrad)"
      />

      {/* Head profile */}
      <path
        d="M64 16 C68 20 72 28 72 36 C72 40 70 44 68 46 L64 42 C66 40 68 38 68 34 C68 28 64 22 62 20 L58 26 C60 28 62 32 62 36 C62 38 60 40 58 42 L54 38 C56 36 58 34 58 32 C58 28 54 26 52 28 L50 32 L46 28 C50 22 58 18 64 16 Z"
        fill="url(#logoGrad)"
      />
    </svg>
  );
}

export function Logo({
  size = "md",
  showText = true,
  asLink = true,
  className,
}: LogoProps) {
  const { icon, text } = sizeMap[size];

  const content = (
    <div
      className={cn(
        "flex items-center gap-2 group",
        asLink && "cursor-pointer",
        className,
      )}
    >
      <div className="group-hover:scale-105 transition-transform">
        <LogoIcon size={icon} />
      </div>
      {showText && (
        <span className={cn("font-semibold tracking-tight", text)}>
          SyncHire
        </span>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link
        href="/"
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        {content}
      </Link>
    );
  }

  return content;
}
