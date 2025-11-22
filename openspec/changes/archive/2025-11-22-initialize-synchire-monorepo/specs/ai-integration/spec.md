# Spec: AI Integration

**Capability:** `ai-integration`
**Status:** Proposed

## Overview
Configure Gemini 2.5 Flash and OpenAI gpt-realtime for AI-powered features.

## ADDED Requirements

### Requirement: Gemini API Configuration
The system SHALL configure Gemini 2.5 Flash for question generation and CV analysis.

#### Scenario: Generate questions
**Given** Gemini API key is configured
**When** job description is provided
**Then** 30-40 interview questions are generated

### Requirement: OpenAI Realtime Configuration
The system SHALL configure OpenAI gpt-realtime for real-time interviews.

#### Scenario: Conduct interview
**Given** OpenAI gpt-realtime is configured
**When** interview starts
**Then** AI responds to candidate in real-time
