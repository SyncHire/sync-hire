/**
 * API Route: Start an interview
 * Creates a Stream call and invites the Python AI agent
 * POST /api/start-interview
 * Supports both interview IDs and application IDs
 */
import crypto from "crypto";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import type { Question } from "@/lib/types/interview-types";
import type { Job, Interview } from "@/lib/storage/storage-interface";
import { getStorage } from "@/lib/storage/storage-factory";
import { getStreamClient } from "@/lib/stream-token";
import { mergeInterviewQuestions } from "@/lib/utils/question-utils";
import { getAgentEndpoint, getAgentHeaders } from "@/lib/agent-config";
import { getServerSession } from "@/lib/auth-server";

/**
 * Generate a short, deterministic call ID from an application or interview ID.
 * Stream has a 64 character limit for call IDs.
 * Uses MD5 hash (truncated) for determinism - same ID always gets same call.
 */
function generateCallId(applicationId: string): string {
  // Short IDs (like "interview-1") can be used directly
  if (applicationId.length <= 64) {
    return applicationId;
  }
  // For longer application IDs, create a deterministic hash-based short ID
  const hash = crypto.createHash("md5").update(applicationId).digest("hex").slice(0, 16);
  return `call-${hash}`;
}

// Track which calls have had agents invited (in-memory cache)
// This prevents duplicate invitations on page refreshes
// Also stores whether video avatar is enabled for that call
const invitedCalls = new Map<string, { videoAvatarEnabled: boolean }>();

export async function POST(request: Request) {
  try {
    const { interviewId, candidateId, candidateName } = await request.json();

    if (!interviewId || !candidateId) {
      return NextResponse.json(
        { error: "interviewId and candidateId are required" },
        { status: 400 },
      );
    }

    // Get authenticated user
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    const user = session.user;

    const storage = getStorage();
    let job: Job | null = null;
    let questions: Question[] = [];

    // Try to get interview from database
    let interview: Interview | null = await storage.getInterview(interviewId);

    if (interview) {
      // Get job from storage
      job = await storage.getJob(interview.jobId);
    } else if (interviewId.startsWith("application-")) {
      // Parse application ID: application-job-{timestamp}-{random}-{userId} -> jobId = job-{timestamp}-{random}
      const jobIdMatch = interviewId.match(/^application-(job-\d+-[a-z0-9]+)-/);
      if (jobIdMatch) {
        const jobId = jobIdMatch[1];
        job = await storage.getJob(jobId);

        if (job) {
          // Try to load generated questions
          const userCvId = await storage.getUserCVId(user.id);
          if (userCvId) {
            const questionSet = await storage.getInterviewQuestions(userCvId, jobId);

            if (questionSet) {
              // Use utility to merge custom questions (from JD) and AI-personalized questions
              questions = mergeInterviewQuestions(questionSet);
            }
          }

          // Create synthetic interview for application
          interview = {
            id: interviewId,
            jobId,
            candidateId: user.id,
            status: "PENDING" as const,
            callId: null,
            transcript: null,
            score: null,
            durationMinutes: 30,
            aiEvaluation: null,
            createdAt: new Date(),
            completedAt: null,
          };
        }
      }
    }

    if (!interview || !job) {
      return NextResponse.json(
        { error: "Interview or job not found" },
        { status: 404 },
      );
    }

    // Use generated questions if available, otherwise map job's questions to agent format
    let interviewQuestions: Question[] = questions;
    if (interviewQuestions.length === 0 && job.questions) {
      logger.warn("No personalized questions found, using job defaults", { api: "start-interview", interviewId, questionCount: job.questions.length });
      // Map database JobQuestion to agent Question format
      interviewQuestions = job.questions.map((q) => ({
        id: q.id,
        text: q.content,
        type: "video" as const, // Default to video for agent
        duration: q.duration,
        category: (q.category ?? "Technical Skills") as Question["category"],
      }));
    }

    // Generate a short call ID (Stream has 64 char limit)
    const callId = generateCallId(interviewId);

    // Create the Stream call (getOrCreate returns existing call if it exists)
    const streamClient = getStreamClient();
    const call = streamClient.video.call("default", callId);

    const callData = await call.getOrCreate({
      data: {
        created_by_id: candidateId,
        settings_override: {
          audio: {
            mic_default_on: true,
            speaker_default_on: true,
            default_device: "speaker",
          },
          video: {
            camera_default_on: true,
            enabled: true,
            target_resolution: {
              width: 1280,
              height: 720,
              bitrate: 3000000,
            },
          },
          transcription: {
            mode: "auto-on",
            closed_caption_mode: "auto-on",
          },
        },
        members: [{ user_id: candidateId, role: "admin" }],
      },
      ring: false,
      notify: false,
    });

    // Check if this is a new call or existing call
    const isNewCall = callData.created;
    logger.info("Call status", { api: "start-interview", callId, isNewCall: isNewCall ? "NEW" : "EXISTING" });

    // If call already exists, ensure member has admin role (fixes permission issues)
    if (!isNewCall) {
      try {
        await call.updateCallMembers({
          update_members: [{ user_id: candidateId, role: "admin" }],
        });
        logger.debug("Updated member role to admin", { api: "start-interview", callId });
      } catch (memberUpdateErr) {
        logger.warn("Could not update member role", { api: "start-interview", callId, error: memberUpdateErr instanceof Error ? memberUpdateErr.message : String(memberUpdateErr) });
      }
    }

    // Check if we've already invited an agent to this call (prevents duplicates)
    const existingCall = invitedCalls.get(callId);
    const alreadyInvited = !!existingCall;
    logger.debug("Agent invitation check", { api: "start-interview", callId, alreadyInvited });

    let videoAvatarEnabled = existingCall?.videoAvatarEnabled ?? false;

    // Invite agent if we haven't invited one yet (regardless of whether call is new or existing)
    if (!alreadyInvited) {
      const agentUrl = getAgentEndpoint("/join-interview");
      logger.debug("Sending request to agent", { api: "start-interview", callId, agentUrl });
      try {
        const agentResponse = await fetch(agentUrl, {
          method: "POST",
          headers: getAgentHeaders(),
          body: JSON.stringify({
            callId,
            questions: interviewQuestions,
            candidateName: candidateName || "Candidate",
            jobTitle: job.title,
          }),
        });

        logger.debug("Agent response received", { api: "start-interview", callId, status: agentResponse.status });

        if (!agentResponse.ok) {
          const errorText = await agentResponse.text();
          logger.error(new Error("Failed to invite agent"), { api: "start-interview", callId, errorText });
          return NextResponse.json(
            { error: "Failed to invite AI agent to interview" },
            { status: 500 },
          );
        }

        const agentData = await agentResponse.json();
        logger.info("Agent invitation successful", { api: "start-interview", callId, videoAvatarEnabled: agentData.videoAvatarEnabled });

        // Capture video avatar status from agent response
        videoAvatarEnabled = agentData.videoAvatarEnabled ?? false;

        // Mark this call as having an invited agent and store video avatar status
        invitedCalls.set(callId, { videoAvatarEnabled });
      } catch (agentError) {
        logger.error(agentError, { api: "start-interview", operation: "invite-agent", callId });
        return NextResponse.json(
          { error: "AI agent service unavailable" },
          { status: 503 },
        );
      }
    } else {
      logger.debug("Agent already invited, skipping duplicate", { api: "start-interview", callId });
    }

    return NextResponse.json({
      success: true,
      callId,
      interviewId,
      videoAvatarEnabled,
      message: "Interview started and AI agent invited",
    });
  } catch (error) {
    logger.error(error, { api: "start-interview", operation: "start" });
    return NextResponse.json(
      { error: "Failed to start interview" },
      { status: 500 },
    );
  }
}
