## 1. API Implementation
- [x] 1.1 Create `/api/interviews/[id]` endpoint to fetch single interview with full details
- [x] 1.2 Add `getInterview(id)` method to storage interface (already exists)
- [x] 1.3 Implement `getInterview` in file-storage (already exists)

## 2. Interview Results Page
- [x] 2.1 Create `useInterviewDetails` React Query hook
- [x] 2.2 Update results page to use AI evaluation from interview data
- [x] 2.3 Display score, duration, and completion time from API
- [x] 2.4 Show AI feedback/summary if available
- [x] 2.5 Add "View in HR Dashboard" navigation link

## 3. Webhook Enhancement
- [x] 3.1 Update interview-complete webhook to store score in interview record
- [x] 3.2 Store AI evaluation feedback if provided

## 4. Demo Flow Navigation
- [x] 4.1 Add link from results page to HR applicants view
- [x] 4.2 Ensure HR view shows the completed interview immediately

## 5. Demo Fallback Data
- [x] 5.1 Add demo CV extraction data to mock-data.ts
- [x] 5.2 Add demo applicants data for HR view
- [x] 5.3 Update /api/jobs/apply to use demo CV fallback
- [x] 5.4 Update /api/jobs/[id]/applicants to include demo applicants

## 6. Validation
- [ ] 6.1 Test full demo flow: interview → results → HR view
- [ ] 6.2 Verify scores display correctly in both views
