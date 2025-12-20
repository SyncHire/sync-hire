/**
 * Novu Service Factory
 *
 * Provides a singleton instance of the Novu notification service.
 */

import { Novu } from "@novu/api";
import { novuConfig, validateNovuConfig } from "./config";
import { NovuNotificationService } from "./novu-service";

let novuServiceInstance: NovuNotificationService | null = null;

export function getNovuService(): NovuNotificationService {
  if (novuServiceInstance) {
    return novuServiceInstance;
  }

  validateNovuConfig();

  const client = new Novu({
    secretKey: novuConfig.apiKey,
  });

  novuServiceInstance = new NovuNotificationService(client);
  return novuServiceInstance;
}

export type {
  EmailVerificationParams,
  InterviewCompletedParams,
  InterviewScheduledParams,
  InterviewStartedParams,
  NewInterviewResultParams,
  PasswordResetParams,
  TeamInvitationParams,
} from "./novu-service";
export { NovuNotificationService } from "./novu-service";
