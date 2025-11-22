# Spec: File Storage

**Capability:** `file-storage`
**Status:** Proposed

## Overview
Integrate Firebase Cloud Storage for CV uploads and interview recordings.

## ADDED Requirements

### Requirement: Firebase Admin SDK Setup
The system SHALL configure Firebase Admin SDK for Cloud Storage access.

#### Scenario: Upload file
**Given** service account credentials are configured
**When** file is uploaded to Firebase Storage
**Then** file is stored successfully
**And** public URL is returned
