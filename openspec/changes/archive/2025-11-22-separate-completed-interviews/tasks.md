# Implementation Tasks

## 1. Update Job Matching Flow

- [x] 1.1 Modify `/apps/web/src/app/candidate/jobs/page.tsx` to filter out completed interviews
- [x] 1.2 Update job matching logic to exclude interviews with status "COMPLETED"
- [x] 1.3 Add empty state handling when all matching interviews are completed
- [x] 1.4 Add link to interview history page in empty state message
- [x] 1.5 Update summary statistics calculation to exclude completed interviews

## 2. Create Interview History Page

- [x] 2.1 Create new page at `/apps/web/src/app/candidate/history/page.tsx`
- [x] 2.2 Implement table component for displaying completed interviews
- [x] 2.3 Fetch completed interviews (status === "COMPLETED") from mock data
- [x] 2.4 Display table columns: job title, company name, completion date, interview score
- [x] 2.5 Make each table row clickable linking to `/interview/[id]/results`
- [x] 2.6 Implement empty state when no completed interviews exist
- [x] 2.7 Add call-to-action button to browse jobs in empty state

## 3. Implement Responsive Table Layout

- [x] 3.1 Create responsive table component similar to HR applicant listing (reference: `/apps/web/src/app/hr/applicants/page.tsx`)
- [x] 3.2 Implement desktop view with traditional table layout (width >= 768px)
- [x] 3.3 Implement mobile view with stacked or scrollable layout (width < 768px)
- [x] 3.4 Add hover states for rows on desktop
- [x] 3.5 Ensure touch targets meet minimum size requirements on mobile (44x44px)
- [x] 3.6 Style table with consistent design system (Tailwind CSS)

## 4. Update Data Display Logic

- [x] 4.1 Replace match percentage with interview score in history table
- [x] 4.2 Format interview score as "X/100" or "X%" in table cells
- [x] 4.3 Sort interviews by completion date (most recent first)
- [x] 4.4 Add optional column sorting functionality if time permits
- [x] 4.5 Display completion date in human-readable format (e.g., "Nov 22, 2025")

## 5. Add Navigation and Routing

- [x] 5.1 Add "Interview History" link to candidate navigation menu/layout
- [x] 5.2 Update navigation highlighting for active history page
- [x] 5.3 Add breadcrumb or back button on interview detail page when accessed from history
- [x] 5.4 Ensure routing works correctly for `/candidate/history` route
- [x] 5.5 Add metadata (title, description) for history page

## 6. Testing and Validation

- [x] 6.1 Test job matching page filters out completed interviews correctly
- [x] 6.2 Test history page displays only completed interviews
- [x] 6.3 Test empty states for both pages
- [x] 6.4 Test navigation between history page and interview detail page
- [x] 6.5 Test responsive layouts on desktop, tablet, and mobile viewports
- [x] 6.6 Test table sorting functionality (if implemented)
- [x] 6.7 Verify accessibility (keyboard navigation, screen reader compatibility)
- [x] 6.8 Cross-browser testing (Chrome, Firefox, Safari, Edge)

## 7. Documentation and Cleanup

- [x] 7.1 Update navigation documentation if applicable
- [x] 7.2 Add comments to complex filtering or sorting logic
- [x] 7.3 Ensure code follows project conventions (TypeScript strict mode, naming conventions)
- [x] 7.4 Run linter and formatter (Biome)
- [x] 7.5 Update any relevant documentation or README files
