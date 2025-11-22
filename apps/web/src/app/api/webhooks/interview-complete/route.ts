/**
 * Webhook: Interview Complete
 * Receives notification when an AI interview is completed
 * POST /api/webhooks/interview-complete
 */
import { NextResponse } from 'next/server';

interface InterviewCompletePayload {
  interviewId: string;
  candidateName: string;
  jobTitle: string;
  durationMinutes: number;
  completedAt: string;
  status: string;
  transcript?: Array<{
    speaker: string;
    text: string;
    timestamp: number;
  }>;
}

export async function POST(request: Request) {
  try {
    const payload: InterviewCompletePayload = await request.json();

    console.log('📥 Interview completion webhook received:', {
      interviewId: payload.interviewId,
      candidateName: payload.candidateName,
      jobTitle: payload.jobTitle,
      durationMinutes: payload.durationMinutes,
      completedAt: payload.completedAt,
      status: payload.status,
      transcriptLength: payload.transcript?.length ?? 0,
    });

    // Log transcript summary
    if (payload.transcript && payload.transcript.length > 0) {
      console.log('📝 Transcript received:');
      payload.transcript.forEach((entry, i) => {
        const prefix = entry.speaker === 'agent' ? '🤖' : '👤';
        console.log(`   ${prefix} [${entry.timestamp.toFixed(1)}s] ${entry.text.substring(0, 100)}${entry.text.length > 100 ? '...' : ''}`);
      });
    }

    // TODO: Store interview completion in database
    // - Update interview status to "completed"
    // - Save duration and transcript
    // - Trigger analysis/scoring pipeline
    // - Send notification to hiring manager

    return NextResponse.json({
      success: true,
      message: 'Interview completion received',
      interviewId: payload.interviewId,
    });
  } catch (error) {
    console.error('Error processing interview completion webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
