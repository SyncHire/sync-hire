# Change: Add Background CV Extraction Process

## Why

Currently, when candidates upload CVs, the system only performs simulated processing for job matching without extracting and storing the structured CV data. This misses an opportunity to build valuable CV data assets that could be used for future features like candidate profiling, skill analytics, and improved matching algorithms.

The enhancement will leverage the existing backend processing patterns from the 2025-11-22-add-ai-job-creation-workflow to extract and store structured CV data without disrupting the current user experience.

## What Changes

- **Background CV Extraction**: Trigger automatic CV data extraction after upload using the same Gemini API patterns as JD extraction
- **CV Data Storage**: Store extracted CV schemas in a new `cv-extraction` folder following the `jd-extraction` pattern
- **Non-Blocking Processing**: Ensure extraction runs in background without affecting the existing job matching flow
- **Reuse Existing Patterns**: Leverage the storage interface, hashing utilities, and Gemini processing from JD extraction

## Impact

### Affected Specs
- **candidate-job-matching**: Extend to support background CV extraction trigger
- **file-storage**: Add CV extraction storage alongside JD extraction
- **ai-integration**: Add CV schema extraction to existing AI processing capabilities

### Affected Code
- **Backend Processing**: Extend `JobDescriptionProcessor` pattern or create `CVProcessor`
- **Storage**: Add `/data/cv-extractions/` folder alongside existing `/data/jd-extractions/`
- **API**: Modify existing CV upload flow to trigger background extraction
- **CV Upload Flow**: Update `candidate/jobs/page.tsx` to start background process after successful upload

### Breaking Changes
None - This is additive functionality that enhances existing CV processing without changing user experience.