/**
 * Resend Email Service
 *
 * Transactional email sending for authentication flows:
 * - Email verification
 * - Password reset
 * - Organization invitations
 */

import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";
import { VerificationEmail } from "./templates/verification-email";
import { PasswordResetEmail } from "./templates/password-reset-email";
import { InvitationEmail } from "./templates/invitation-email";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.EMAIL_FROM || "SyncHire <noreply@synchire.com>";

/**
 * Send email verification link to new user
 */
export async function sendVerificationEmail(
  email: string,
  verificationUrl: string
): Promise<void> {
  const { logger } = Sentry;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Verify your SyncHire account",
      react: VerificationEmail({ verificationUrl }),
    });

    if (error) {
      logger.error("Failed to send verification email", {
        email,
        error: error.message,
      });
      Sentry.captureException(new Error(`Verification email failed: ${error.message}`));
      return;
    }

    logger.info("Verification email sent", { email });
  } catch (err) {
    logger.error("Verification email error", { email, error: err });
    Sentry.captureException(err);
  }
}

/**
 * Send password reset link to user
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<void> {
  const { logger } = Sentry;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Reset your SyncHire password",
      react: PasswordResetEmail({ resetUrl }),
    });

    if (error) {
      logger.error("Failed to send password reset email", {
        email,
        error: error.message,
      });
      Sentry.captureException(new Error(`Password reset email failed: ${error.message}`));
      return;
    }

    logger.info("Password reset email sent", { email });
  } catch (err) {
    logger.error("Password reset email error", { email, error: err });
    Sentry.captureException(err);
  }
}

/**
 * Send organization invitation to user
 */
export async function sendInvitationEmail(
  email: string,
  organizationName: string,
  inviterName: string
): Promise<void> {
  const { logger } = Sentry;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You've been invited to join ${organizationName} on SyncHire`,
      react: InvitationEmail({ organizationName, inviterName }),
    });

    if (error) {
      logger.error("Failed to send invitation email", {
        email,
        organizationName,
        error: error.message,
      });
      Sentry.captureException(new Error(`Invitation email failed: ${error.message}`));
      return;
    }

    logger.info("Invitation email sent", { email, organizationName });
  } catch (err) {
    logger.error("Invitation email error", { email, error: err });
    Sentry.captureException(err);
  }
}
