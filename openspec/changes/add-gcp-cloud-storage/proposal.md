# Change: Add GCP Cloud Storage Integration

## Why

The current file storage implementation uses placeholder paths and local file storage. For production deployment, we need to store CV and Job Description files in GCP Cloud Storage for reliability, scalability, and proper file management.

## What Changes

- Add `@google-cloud/storage` package for GCS integration
- Create GCS client singleton following existing `gemini-client.ts` pattern
- Create cloud storage provider interface with GCS and local fallback implementations
- Update `DatabaseStorage` to upload files to GCS instead of using placeholder paths
- Add environment variables for GCS bucket configuration
- Support both development (local files) and production (GCS) modes via `USE_CLOUD_STORAGE` flag

## Impact

- Affected specs: `file-storage`
- Affected code:
  - `apps/web/src/lib/storage/database-storage.ts` - Replace TODO markers at lines 50 and 244
  - `apps/web/src/lib/storage/gcs-client.ts` - New file
  - `apps/web/src/lib/storage/cloud/` - New directory with provider pattern
  - `apps/web/.env.example` - Add GCS environment variables
