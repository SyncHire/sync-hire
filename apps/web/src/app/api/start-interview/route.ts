/**
 * API Route: Start an interview
 * Creates a Stream call and invites the Python AI agent
 * POST /api/start-interview
 * Supports both mock interview IDs and application IDs
 */
import { NextResponse } from "next/server";
import {
  getDemoUser,
  getJobById,
  type Job,
  mockInterviews,
  type Question,
} from "@/lib/mock-data";
import { getStorage } from "@/lib/storage/storage-factory";
import { getStreamClient } from "@/lib/stream-token";
import { generateStringHash } from "@/lib/utils/hash-utils";
import { mergeInterviewQuestions } from "@/lib/utils/question-utils";

const AGENT_API_URL = process.env.AGENT_API_URL || "http://localhost:8080";

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

    const storage = getStorage();
    const demoUser = getDemoUser();
    let job: Job | null = null;
    let questions: Question[] = [];

    // Try to get interview from mock data first
    let interview = mockInterviews[interviewId];

    if (interview) {
      job = getJobById(interview.jobId) || null;
    } else if (interviewId.startsWith("application-")) {
      // Parse application ID: application-job-5-demo-user -> jobId = job-5
      const jobIdMatch = interviewId.match(/^application-(job-\d+)-/);
      if (jobIdMatch) {
        const jobId = jobIdMatch[1];
        job = await storage.getJob(jobId);

        if (job) {
          // Try to load generated questions
          const userCvId = await storage.getUserCVId(demoUser.id);
          if (userCvId) {
            const combinedHash = generateStringHash(userCvId + jobId);
            const questionSet =
              await storage.getInterviewQuestions(combinedHash);

            if (questionSet) {
              // Use utility to merge custom questions (from JD) and AI-personalized questions
              questions = mergeInterviewQuestions(questionSet);
            }
          }

          // Create synthetic interview
          interview = {
            id: interviewId,
            jobId,
            candidateId: demoUser.id,
            status: "PENDING" as const,
            durationMinutes: 30,
            createdAt: new Date(),
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

    // Use generated questions if available, otherwise use job's default questions
    const interviewQuestions = questions.length > 0 ? questions : job.questions;

    // Use interview ID directly as call ID (already formatted as "interview-1", etc.)
    const callId = interviewId;

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
    console.log(
      `📞 Call status: ${isNewCall ? "NEW" : "EXISTING"} - ${callId}`,
    );

    // If call already exists, ensure member has admin role (fixes permission issues)
    if (!isNewCall) {
      try {
        await call.updateCallMembers({
          update_members: [{ user_id: candidateId, role: "admin" }],
        });
        console.log("🔄 Updated member role to admin");
      } catch (memberUpdateErr) {
        console.warn("⚠️ Could not update member role:", memberUpdateErr);
      }
    }

    // Check if we've already invited an agent to this call (prevents duplicates)
    const existingCall = invitedCalls.get(callId);
    const alreadyInvited = !!existingCall;
    console.log(`🤖 Agent already invited: ${alreadyInvited}`);

    let videoAvatarEnabled = existingCall?.videoAvatarEnabled ?? false;

    // Invite agent if we haven't invited one yet (regardless of whether call is new or existing)
    if (!alreadyInvited) {
      console.log(`🔗 Agent URL: ${AGENT_API_URL}/join-interview`);
      try {
        console.log("⏳ Sending request to agent...");
        const agentResponse = await fetch(`${AGENT_API_URL}/join-interview`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            callId,
            questions: interviewQuestions,
            candidateName: candidateName || "Candidate",
            jobTitle: job.title,
          }),
        });

        console.log(`📥 Agent response status: ${agentResponse.status}`);

        if (!agentResponse.ok) {
          const errorText = await agentResponse.text();
          console.error("❌ Failed to invite agent:", errorText);
          return NextResponse.json(
            { error: "Failed to invite AI agent to interview" },
            { status: 500 },
          );
        }

        const agentData = await agentResponse.json();
        console.log("✅ Agent response:", agentData);

        // Capture video avatar status from agent response
        videoAvatarEnabled = agentData.videoAvatarEnabled ?? false;

        // Mark this call as having an invited agent and store video avatar status
        invitedCalls.set(callId, { videoAvatarEnabled });
      } catch (agentError) {
        console.error("❌ Error calling agent API:", agentError);
        return NextResponse.json(
          { error: "AI agent service unavailable" },
          { status: 503 },
        );
      }
    } else {
      console.log(
        "♻️  Agent already invited to this call - skipping duplicate invitation",
      );
    }

    return NextResponse.json({
      success: true,
      callId,
      interviewId,
      videoAvatarEnabled,
      message: "Interview started and AI agent invited",
    });
  } catch (error) {
    console.error("Error starting interview:", error);
    return NextResponse.json(
      { error: "Failed to start interview" },
      { status: 500 },
    );
  }
}
