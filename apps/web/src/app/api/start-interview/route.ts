/**
 * API Route: Start an interview
 * Creates a Stream call and invites the Python AI agent
 * POST /api/start-interview
 */
import { NextResponse } from 'next/server';
import { getStreamClient } from '@/lib/stream-token';
import { mockInterviews, getJobById } from '@/lib/mock-data';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8080';

// Track which calls have had agents invited (in-memory cache)
// This prevents duplicate invitations on page refreshes
const invitedCalls = new Set<string>();

export async function POST(request: Request) {
  try {
    const { interviewId, candidateId, candidateName } = await request.json();

    if (!interviewId || !candidateId) {
      return NextResponse.json(
        { error: 'interviewId and candidateId are required' },
        { status: 400 }
      );
    }

    // Get interview and job details from mock data
    const interview = mockInterviews[interviewId];
    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    const job = getJobById(interview.jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Use interview ID directly as call ID (already formatted as "interview-1", etc.)
    const callId = interviewId;

    // Create the Stream call (getOrCreate returns existing call if it exists)
    const streamClient = getStreamClient();
    const call = streamClient.video.call('default', callId);

    const callData = await call.getOrCreate({
      data: {
        created_by_id: candidateId,
        settings_override: {
          audio: {
            mic_default_on: true,
            speaker_default_on: true,
            default_device: 'speaker',
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
        },
        members: [
          { user_id: candidateId, role: 'admin' },
        ],
      },
      ring: false,
      notify: false,
    });

    // Check if this is a new call or existing call
    const isNewCall = callData.created;
    console.log(`📞 Call status: ${isNewCall ? 'NEW' : 'EXISTING'} - ${callId}`);

    // If call already exists, ensure member has admin role (fixes permission issues)
    if (!isNewCall) {
      try {
        await call.updateCallMembers({
          update_members: [{ user_id: candidateId, role: 'admin' }],
        });
        console.log('🔄 Updated member role to admin');
      } catch (memberUpdateErr) {
        console.warn('⚠️ Could not update member role:', memberUpdateErr);
      }
    }

    // Check if we've already invited an agent to this call (prevents duplicates)
    const alreadyInvited = invitedCalls.has(callId);
    console.log(`🤖 Agent already invited: ${alreadyInvited}`);

    // Invite agent if we haven't invited one yet (regardless of whether call is new or existing)
    if (!alreadyInvited) {
      // Mark this call as having an invited agent
      invitedCalls.add(callId);
      console.log(`🔗 Agent URL: ${AGENT_API_URL}/join-interview`);
      try {
        console.log('⏳ Sending request to agent...');
        const agentResponse = await fetch(`${AGENT_API_URL}/join-interview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            callId,
            questions: job.questions,
            candidateName: candidateName || 'Candidate',
            jobTitle: job.title,
          }),
        });

        console.log(`📥 Agent response status: ${agentResponse.status}`);

        if (!agentResponse.ok) {
          const errorText = await agentResponse.text();
          console.error('❌ Failed to invite agent:', errorText);
          return NextResponse.json(
            { error: 'Failed to invite AI agent to interview' },
            { status: 500 }
          );
        }

        const agentData = await agentResponse.json();
        console.log('✅ Agent response:', agentData);
      } catch (agentError) {
        console.error('❌ Error calling agent API:', agentError);
        return NextResponse.json(
          { error: 'AI agent service unavailable' },
          { status: 503 }
        );
      }
    } else {
      console.log('♻️  Agent already invited to this call - skipping duplicate invitation');
    }

    return NextResponse.json({
      success: true,
      callId,
      interviewId,
      message: 'Interview started and AI agent invited',
    });
  } catch (error) {
    console.error('Error starting interview:', error);
    return NextResponse.json(
      { error: 'Failed to start interview' },
      { status: 500 }
    );
  }
}
