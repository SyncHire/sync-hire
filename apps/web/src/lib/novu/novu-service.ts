/**
 * Novu Notification Service
 *
 * Server-side service for triggering Novu notification workflows.
 * Uses dependency injection for testability.
 */

import type { Novu } from "@novu/api";
import { logger } from "@/lib/logger";

export interface InterviewScheduledParams {
  subscriberId: string;
  subscriberEmail: string;
  candidateName: string;
  jobTitle: string;
  scheduledAt: Date;
  interviewUrl: string;
}

export interface InterviewStartedParams {
  subscriberId: string;
  jobTitle: string;
  interviewUrl: string;
}

export interface InterviewCompletedParams {
  subscriberId: string;
  subscriberEmail: string;
  candidateName: string;
  jobTitle: string;
  score?: number;
  feedbackUrl: string;
}

export interface NewInterviewResultParams {
  subscriberId: string;
  candidateName: string;
  jobTitle: string;
  score?: number;
  applicantUrl: string;
}

export interface EmailVerificationParams {
  subscriberId: string;
  subscriberEmail: string;
  verificationUrl: string;
}

export interface PasswordResetParams {
  subscriberId: string;
  subscriberEmail: string;
  resetUrl: string;
}

export interface TeamInvitationParams {
  subscriberId: string;
  subscriberEmail: string;
  organizationName: string;
  inviterName: string;
  invitationUrl: string;
}

export class NovuNotificationService {
  constructor(private readonly client: Novu) {}

  async notifyInterviewScheduled(
    params: InterviewScheduledParams,
  ): Promise<void> {
    try {
      await this.client.trigger({
        workflowId: "interview-scheduled",
        to: {
          subscriberId: params.subscriberId,
          email: params.subscriberEmail,
        },
        payload: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          scheduledAt: params.scheduledAt.toISOString(),
          interviewUrl: params.interviewUrl,
        },
      });
      logger.info("Interview scheduled notification sent", {
        subscriberId: params.subscriberId,
        jobTitle: params.jobTitle,
      });
    } catch (error) {
      logger.error(error as Error, {
        operation: "notifyInterviewScheduled",
        subscriberId: params.subscriberId,
      });
    }
  }

  async notifyInterviewStarted(params: InterviewStartedParams): Promise<void> {
    try {
      await this.client.trigger({
        workflowId: "interview-started",
        to: params.subscriberId,
        payload: {
          jobTitle: params.jobTitle,
          interviewUrl: params.interviewUrl,
        },
      });
      logger.info("Interview started notification sent", {
        subscriberId: params.subscriberId,
        jobTitle: params.jobTitle,
      });
    } catch (error) {
      logger.error(error as Error, {
        operation: "notifyInterviewStarted",
        subscriberId: params.subscriberId,
      });
    }
  }

  async notifyInterviewCompleted(
    params: InterviewCompletedParams,
  ): Promise<void> {
    try {
      await this.client.trigger({
        workflowId: "interview-completed",
        to: {
          subscriberId: params.subscriberId,
          email: params.subscriberEmail,
        },
        payload: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          score: params.score,
          feedbackUrl: params.feedbackUrl,
        },
      });
      logger.info("Interview completed notification sent", {
        subscriberId: params.subscriberId,
        jobTitle: params.jobTitle,
      });
    } catch (error) {
      logger.error(error as Error, {
        operation: "notifyInterviewCompleted",
        subscriberId: params.subscriberId,
      });
    }
  }

  async notifyNewInterviewResult(
    params: NewInterviewResultParams,
  ): Promise<void> {
    try {
      await this.client.trigger({
        workflowId: "new-interview-result",
        to: params.subscriberId,
        payload: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          score: params.score,
          applicantUrl: params.applicantUrl,
        },
      });
      logger.info("New interview result notification sent to HR", {
        subscriberId: params.subscriberId,
        candidateName: params.candidateName,
      });
    } catch (error) {
      logger.error(error as Error, {
        operation: "notifyNewInterviewResult",
        subscriberId: params.subscriberId,
      });
    }
  }

  async sendEmailVerification(params: EmailVerificationParams): Promise<void> {
    try {
      await this.client.trigger({
        workflowId: "email-verification",
        to: {
          subscriberId: params.subscriberId,
          email: params.subscriberEmail,
        },
        payload: {
          verificationUrl: params.verificationUrl,
        },
      });
      logger.info("Email verification sent", {
        subscriberId: params.subscriberId,
      });
    } catch (error) {
      logger.error(error as Error, {
        operation: "sendEmailVerification",
        subscriberId: params.subscriberId,
      });
      throw error;
    }
  }

  async sendPasswordReset(params: PasswordResetParams): Promise<void> {
    try {
      await this.client.trigger({
        workflowId: "password-reset",
        to: {
          subscriberId: params.subscriberId,
          email: params.subscriberEmail,
        },
        payload: {
          resetUrl: params.resetUrl,
        },
      });
      logger.info("Password reset email sent", {
        subscriberId: params.subscriberId,
      });
    } catch (error) {
      logger.error(error as Error, {
        operation: "sendPasswordReset",
        subscriberId: params.subscriberId,
      });
      throw error;
    }
  }

  async sendTeamInvitation(params: TeamInvitationParams): Promise<void> {
    try {
      await this.client.trigger({
        workflowId: "team-invitation",
        to: {
          subscriberId: params.subscriberId,
          email: params.subscriberEmail,
        },
        payload: {
          organizationName: params.organizationName,
          inviterName: params.inviterName,
          invitationUrl: params.invitationUrl,
        },
      });
      logger.info("Team invitation sent", {
        subscriberId: params.subscriberId,
        organizationName: params.organizationName,
      });
    } catch (error) {
      logger.error(error as Error, {
        operation: "sendTeamInvitation",
        subscriberId: params.subscriberId,
      });
      throw error;
    }
  }
}
