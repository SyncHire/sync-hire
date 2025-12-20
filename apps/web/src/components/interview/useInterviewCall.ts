"use client";

import { type Call, useStreamVideoClient } from "@stream-io/video-react-sdk";
/**
 * Custom hook to manage interview call lifecycle
 * Simplified: join happens on user action (button click), not on mount
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useStartCandidateInterview } from "@/lib/hooks/use-candidate-interview";
import { logger } from "@/lib/logger";

interface UseInterviewCallParams {
  interviewId: string;
  candidateId: string;
  candidateName: string;
  enabled: boolean; // Only start when user clicks "Join"
}

interface DeviceErrors {
  camera: string | null;
  microphone: string | null;
  transcription: string | null;
}

export function useInterviewCall({
  interviewId,
  candidateId,
  candidateName,
  enabled,
}: UseInterviewCallParams) {
  const client = useStreamVideoClient();
  const [call, setCall] = useState<Call | null>(null);
  const [callEnded, setCallEnded] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [videoAvatarEnabled, setVideoAvatarEnabled] = useState(false);
  const [deviceErrors, setDeviceErrors] = useState<DeviceErrors>({
    camera: null,
    microphone: null,
    transcription: null,
  });
  const startInterviewMutation = useStartCandidateInterview();

  useEffect(() => {
    // Only run when enabled and we have a client, and haven't already joined
    if (!enabled || !client || call || isJoining) {
      return;
    }

    const joinInterview = async () => {
      setIsJoining(true);
      // Reset device errors on new join attempt
      setDeviceErrors({ camera: null, microphone: null, transcription: null });

      try {
        logger.info("Starting interview", { candidateName, interviewId });

        // Start interview and get call ID
        const data = await startInterviewMutation.mutateAsync({
          interviewId,
          candidateName,
        });

        logger.info("Interview started, joining call", {
          callId: data.callId,
          videoAvatarEnabled: data.videoAvatarEnabled,
        });
        setVideoAvatarEnabled(data.videoAvatarEnabled ?? false);

        // Create the call object
        const videoCall = client.call("default", data.callId);

        // Enable camera and microphone BEFORE joining
        try {
          await videoCall.camera.enable();
        } catch (camErr) {
          const errorMessage =
            camErr instanceof Error ? camErr.message : "Camera unavailable";
          logger.warn("Could not enable camera", { error: errorMessage });
          setDeviceErrors((prev) => ({ ...prev, camera: errorMessage }));
          toast.warning("Camera unavailable", {
            description:
              "You can continue without video. Check your camera permissions.",
          });
        }
        try {
          await videoCall.microphone.enable();
        } catch (micErr) {
          const errorMessage =
            micErr instanceof Error ? micErr.message : "Microphone unavailable";
          logger.warn("Could not enable microphone", { error: errorMessage });
          setDeviceErrors((prev) => ({ ...prev, microphone: errorMessage }));
          toast.warning("Microphone unavailable", {
            description:
              "Audio is required for the interview. Check your microphone permissions.",
          });
        }

        // Join the call
        await videoCall.join({ create: true, video: true });

        // Start transcription for closed captions (English only)
        try {
          await videoCall.startTranscription({
            language: "en",
            enable_closed_captions: true,
          });
          logger.info("Transcription started successfully");
        } catch (transcriptionErr) {
          const errorMessage =
            transcriptionErr instanceof Error
              ? transcriptionErr.message
              : "Transcription unavailable";
          logger.error("Could not start transcription", {
            error: errorMessage,
          });
          setDeviceErrors((prev) => ({
            ...prev,
            transcription: errorMessage,
          }));
          // Note: Don't show toast for transcription - it's a backend feature
        }

        // Listen for call ended events
        videoCall.on("call.ended", () => {
          logger.info("Call ended by host");
          setCallEnded(true);
        });

        videoCall.on("call.session_participant_left", () => {
          logger.info("Participant left - ending interview");
          setTimeout(() => setCallEnded(true), 500);
        });

        setCall(videoCall);
        setIsJoining(false);
        logger.info("Successfully joined call");
      } catch (err) {
        logger.error(err instanceof Error ? err : new Error(String(err)), {
          operation: "initializeInterview",
          interviewId,
        });
        toast.error("Failed to join interview", {
          description: "Please refresh the page and try again.",
        });
        setIsJoining(false);
      }
    };

    joinInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    client,
    call,
    candidateName,
    interviewId,
    isJoining,
    startInterviewMutation.mutateAsync,
  ]);

  return {
    call,
    callEnded,
    videoAvatarEnabled,
    deviceErrors,
    isLoading: isJoining || startInterviewMutation.isPending,
    error: startInterviewMutation.error,
    reset: () => {
      setCall(null);
      setCallEnded(false);
      setIsJoining(false);
      setVideoAvatarEnabled(false);
      setDeviceErrors({ camera: null, microphone: null, transcription: null });
      startInterviewMutation.reset();
    },
  };
}
