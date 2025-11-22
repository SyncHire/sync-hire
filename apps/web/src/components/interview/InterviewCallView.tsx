'use client';

/**
 * Interview Call View - Exports both versions for comparison
 *
 * Enhanced: Full custom layout with transcript panel, waveform, PIP
 * Simple: Stream's built-in SpeakerLayout
 */

// Re-export the enhanced version as default
export { InterviewCallViewEnhanced as InterviewCallView } from './InterviewCallViewEnhanced';

// Also export both versions explicitly
export { InterviewCallViewEnhanced } from './InterviewCallViewEnhanced';
export { InterviewCallViewSimple } from './InterviewCallViewSimple';
