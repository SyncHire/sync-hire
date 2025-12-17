/**
 * Resend Email Service
 *
 * Transactional email sending for authentication flows:
 * - Email verification
 * - Password reset
 * - Organization invitations
 *
 * Uses dependency injection for testability.
 * Throws errors on failure for caller visibility.
 */

import { Resend } from "resend";
import { logger } from "@/lib/logger";
import { VerificationEmail } from "./templates/verification-email";
import { PasswordResetEmail } from "./templates/password-reset-email";
import { InvitationEmail } from "./templates/invitation-email";

/**
 * Email service for transactional emails.
 * Accepts Resend client via constructor for testability.
 */
export class EmailService {
  constructor(
    private readonly client: Resend,
    private readonly fromEmail: string
  ) {}

  /**
   * Send email verification link to new user.
   * @throws Error if email sending fails
   */
  async sendVerificationEmail(
    email: string,
    verificationUrl: string
  ): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.fromEmail,
      to: email,
      subject: "Verify your SyncHire account",
      react: VerificationEmail({ verificationUrl }),
    });

    if (error) {
      const err = new Error(`Verification email failed: ${error.message}`);
      logger.error(err, { api: "email", operation: "sendVerification", email });
      throw err;
    }

    logger.info("Verification email sent", { api: "email", email });
  }

  /**
   * Send password reset link to user.
   * @throws Error if email sending fails
   */
  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.fromEmail,
      to: email,
      subject: "Reset your SyncHire password",
      react: PasswordResetEmail({ resetUrl }),
    });

    if (error) {
      const err = new Error(`Password reset email failed: ${error.message}`);
      logger.error(err, { api: "email", operation: "sendPasswordReset", email });
      throw err;
    }

    logger.info("Password reset email sent", { api: "email", email });
  }

  /**
   * Send organization invitation to user.
   * @throws Error if email sending fails
   */
  async sendInvitationEmail(
    email: string,
    organizationName: string,
    inviterName: string,
    invitationUrl: string
  ): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.fromEmail,
      to: email,
      subject: `You've been invited to join ${organizationName} on SyncHire`,
      react: InvitationEmail({ organizationName, inviterName, invitationUrl }),
    });

    if (error) {
      const err = new Error(`Invitation email failed: ${error.message}`);
      logger.error(err, {
        api: "email",
        operation: "sendInvitation",
        email,
        organizationName,
      });
      throw err;
    }

    logger.info("Invitation email sent", {
      api: "email",
      email,
      organizationName,
    });
  }
}

// Lazy-initialized singleton for production use
let emailServiceInstance: EmailService | null = null;

/**
 * Get or create the EmailService singleton.
 * Validates that RESEND_API_KEY is configured.
 */
export function getEmailService(): EmailService {
  if (emailServiceInstance) {
    return emailServiceInstance;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY environment variable is not configured. Email sending is disabled."
    );
  }

  const fromEmail =
    process.env.EMAIL_FROM || "SyncHire <noreply@sync-hire.com>";

  emailServiceInstance = new EmailService(new Resend(apiKey), fromEmail);
  return emailServiceInstance;
}

/**
 * Create a new EmailService instance with custom dependencies.
 * Useful for testing with mock clients.
 */
export function createEmailService(
  client: Resend,
  fromEmail: string
): EmailService {
  return new EmailService(client, fromEmail);
}

/**
 * Reset the EmailService singleton (for testing purposes).
 */
export function resetEmailService(): void {
  emailServiceInstance = null;
}
