"use client";

import { Inbox } from "@novu/nextjs";
import { dark } from "@novu/nextjs/themes";
import { useTheme } from "next-themes";

interface NotificationInboxProps {
  subscriberId: string;
}

export function NotificationInbox({ subscriberId }: NotificationInboxProps) {
  const { theme } = useTheme();
  const applicationIdentifier =
    process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER;

  if (!applicationIdentifier) {
    return null;
  }

  return (
    <Inbox
      applicationIdentifier={applicationIdentifier}
      subscriberId={subscriberId}
      backendUrl={process.env.NEXT_PUBLIC_NOVU_BACKEND_URL}
      socketUrl={process.env.NEXT_PUBLIC_NOVU_SOCKET_URL}
      appearance={{
        baseTheme: theme === "dark" ? dark : undefined,
        variables: {
          colorBackground: "hsl(var(--popover))",
          colorForeground: "hsl(var(--popover-foreground))",
          colorPrimary: "hsl(var(--primary))",
          colorPrimaryForeground: "hsl(var(--primary-foreground))",
          colorSecondary: "hsl(var(--secondary))",
          colorSecondaryForeground: "hsl(var(--secondary-foreground))",
          colorNeutral: "hsl(var(--border))",
          colorCounter: "hsl(var(--destructive))",
          colorCounterForeground: "hsl(var(--destructive-foreground))",
          fontSize: "14px",
        },
        elements: {
          bellIcon: {
            width: "16px",
            height: "16px",
          },
        },
      }}
      placement="bottom-end"
      placementOffset={8}
    />
  );
}
