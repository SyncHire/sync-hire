/**
 * Better Auth Configuration
 *
 * Server-side auth configuration with:
 * - Email/password authentication with email verification
 * - Google OAuth
 * - Organization plugin with custom roles
 * - Session caching for performance
 */

import { prisma } from "@sync-hire/database";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { getEmailService } from "./email/resend";

// Derive base URL from BETTER_AUTH_URL or WEB_PORT
const port = process.env.WEB_PORT || "3000";
const baseURL = process.env.BETTER_AUTH_URL || `http://localhost:${port}`;

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  // Email/Password with best practices
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    sendVerificationEmail: async ({
      user,
      url,
    }: {
      user: { id: string; email: string };
      url: string;
    }) => {
      await getEmailService().sendVerificationEmail(user, url);
    },
    sendResetPassword: async ({
      user,
      url,
    }: {
      user: { id: string; email: string };
      url: string;
    }) => {
      await getEmailService().sendPasswordResetEmail(user, url);
    },
  },

  // Google OAuth (optional - only enabled if credentials provided)
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Refresh daily
    cookieCache: {
      enabled: true, // Reduce DB queries
      maxAge: 60 * 5, // 5 min cache
    },
  },

  plugins: [
    nextCookies(), // Required for server actions
    organization({
      // Schema now matches Better Auth defaults
      allowSetActive: true,
      // Invitation settings
      invitationExpiresIn: 60 * 60 * 24 * 7, // 1 week
      sendInvitationEmail: async ({
        email,
        organization: org,
        inviter,
        id,
      }: {
        email: string;
        organization: { name: string };
        inviter: { user: { name: string | null; email: string } };
        id: string;
      }) => {
        // Construct the invitation acceptance URL with encoded ID
        const invitationUrl = `${baseURL}/api/auth/organization/accept-invitation?invitationId=${encodeURIComponent(id)}`;
        const inviterDisplayName = inviter.user.name || inviter.user.email;
        await getEmailService().sendInvitationEmail(
          email,
          org.name,
          inviterDisplayName,
          invitationUrl,
          id,
        );
      },
    }),
  ],
});

// Export session type for use throughout the app
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
