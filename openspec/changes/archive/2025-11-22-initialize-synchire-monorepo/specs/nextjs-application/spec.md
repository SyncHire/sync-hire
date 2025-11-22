# Spec: Next.js Application

**Capability:** `nextjs-application`
**Status:** Proposed

## Overview
Initialize Next.js 15.1 application with React 19, Tailwind v4, and basic folder structure.

## ADDED Requirements

### Requirement: Next.js 15.1 Setup
The system SHALL provide Next.js 15.1 with App Router, React 19, and TypeScript 5.7.

#### Scenario: Initialize application
**Given** monorepo foundation exists
**When** create-next-app is run with latest flags
**Then** Next.js 15.1 is installed with App Router

### Requirement: Tailwind v4 Configuration
The system SHALL configure Tailwind CSS v4 with CSS-first configuration.

#### Scenario: Configure Tailwind
**Given** Next.js is initialized
**When** Tailwind v4 is configured in app/globals.css
**Then** @theme directive defines custom design tokens
