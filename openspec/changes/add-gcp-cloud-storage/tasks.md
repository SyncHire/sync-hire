# Tasks: Add GCP Cloud Storage Integration

## 1. Dependencies

- [x] 1.1 Install `@google-cloud/storage` package in `apps/web`

## 2. GCS Client

- [x] 2.1 Create `apps/web/src/lib/storage/gcs-client.ts` singleton
- [x] 2.2 Follow `gemini-client.ts` pattern with globalThis for hot reload

## 3. Cloud Storage Provider

- [x] 3.1 Create `apps/web/src/lib/storage/cloud/cloud-storage-provider.ts` interface
- [x] 3.2 Create `apps/web/src/lib/storage/cloud/gcs-storage-provider.ts` implementation
- [x] 3.3 Create `apps/web/src/lib/storage/cloud/local-storage-provider.ts` fallback
- [x] 3.4 Create `apps/web/src/lib/storage/cloud/storage-provider-factory.ts` factory
- [x] 3.5 Create `apps/web/src/lib/storage/cloud/index.ts` re-exports

## 4. Database Storage Integration

- [x] 4.1 Update `saveUpload` method in `database-storage.ts` (line 50)
- [x] 4.2 Update `saveCVUpload` method in `database-storage.ts` (line 244)

## 5. Environment Configuration

- [x] 5.1 Add GCS environment variables to `apps/web/.env.example`
- [x] 5.2 Document bucket configuration in proposal

## 6. Validation

- [x] 6.1 Run `openspec validate add-gcp-cloud-storage --strict`
- [ ] 6.2 Test with `USE_CLOUD_STORAGE=false` (local mode)
