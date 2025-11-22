"use client";

import { type Call, useStreamVideoClient } from "@stream-io/video-react-sdk";
/**
 * Custom hook to manage interview call lifecycle
 * Simplified: join happens on user action (button click), not on mount
 */
import { useEffect, useState } from "react";
import { useStartInterview } from "@/lib/hooks/use-interview";

interface UseInterviewCallParams {
  interviewId: string;
  candidateId: string;
  candidateName: string;
  enabled: boolean; // Only start when user clicks "Join"
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
  const startInterviewMutation = useStartInterview();

  useEffect(() => {
    // Only run when enabled and we have a client, and haven't already joined
    if (!enabled || !client || call || isJoining) {
      return;
    }

    const joinInterview = async () => {
      setIsJoining(true);

      try {
        console.log("🚀 Starting interview for:", candidateName);

        // Start interview and get call ID
        const data = await startInterviewMutation.mutateAsync({
          interviewId,
          candidateId,
          candidateName,
        });

        console.log("📞 Interview started, joining call:", data.callId);
        console.log("🎭 Video avatar enabled:", data.videoAvatarEnabled);
        setVideoAvatarEnabled(data.videoAvatarEnabled ?? false);

        // Create the call object
        const videoCall = client.call("default", data.callId);

        // Enable camera and microphone BEFORE joining
        try {
          await videoCall.camera.enable();
        } catch (camErr) {
          console.warn("⚠️ Could not enable camera:", camErr);
        }
        try {
          await videoCall.microphone.enable();
        } catch (micErr) {
          console.warn("⚠️ Could not enable microphone:", micErr);
        }

        // Join the call
        await videoCall.join({ create: true, video: true });

        // Start transcription for closed captions (English only)
        try {
          console.log("🎤 Attempting to start transcription...");
          const transcriptionResult = await videoCall.startTranscription({
            language: "en",
            enable_closed_captions: true,
          });
          console.log("🎤 Transcription started:", transcriptionResult);
        } catch (transcriptionErr) {
          console.error("❌ Could not start transcription:", transcriptionErr);
        }

        // Listen for call ended events
        videoCall.on("call.ended", () => {
          console.log("📞 Call ended by host");
          setCallEnded(true);
        });

        videoCall.on("call.session_participant_left", () => {
          console.log("📞 Participant left - ending interview");
          setTimeout(() => setCallEnded(true), 500);
        });

        setCall(videoCall);
        setIsJoining(false);
        console.log("✅ Successfully joined call");
      } catch (err) {
        console.error("Error initializing interview:", err);
        setIsJoining(false);
      }
    };

    joinInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, client]);

  return {
    call,
    callEnded,
    videoAvatarEnabled,
    isLoading: isJoining || startInterviewMutation.isPending,
    error: startInterviewMutation.error,
    reset: () => {
      setCall(null);
      setCallEnded(false);
      setIsJoining(false);
      setVideoAvatarEnabled(false);
      startInterviewMutation.reset();
    },
  };
}
