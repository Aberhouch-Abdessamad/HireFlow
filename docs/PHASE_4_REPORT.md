# Phase 4 Report: Candidates and Applications

## 1. What was implemented

**Backend (written; tests not yet run because Composer packages can't be installed here)**

- **Configurable pipeline** (`recruitment_stages`):
  - Every new company gets the 7 default stages (via a model observer). Existing companies are filled in by the migration.
  - Admins can add, rename, reorder and delete stages. Applied is always first and Hired always last; neither can be removed. A stage that has been used can't be deleted.
- **Candidate talent pool** for each company:
  - Profile fields, experience, education, skills, tags and internal notes.
  - Email is unique per company. Duplicate detection matches on email, phone (digits only) or full name.
  - The same person in two companies is two separate records, so notes and history never cross companies.
  - Search and filtering by tag, skill or job. Deletion is a soft delete.
- **CVs and documents:**
  - PDF or DOCX only, at most 5 MB. Both the detected content type and the file extension are checked.
  - Files are stored on the **private** disk under random UUID names. The stored path is never returned by the API.
  - Downloads go through an authorized streaming endpoint that sends `nosniff` and `no-store` headers and writes an audit entry. Another company's documents, or a document requested under the wrong candidate, return 404.
- **Applications:**
  - One application per candidate per job (enforced by the database too). New applications start in the Applied stage.
  - Stage moves, rejection with a reason (a note is required for "Other"), reopening, and assignment to an active member who can view applications.
  - Every change runs in a transaction with a row lock, adds an append-only history entry (from/to stage and status, who, when, note), writes an audit entry, and fires its event after the commit.
  - **Hired** can only be reached by accepting an offer (`markHired`, used in Phase 5). Moving there manually returns `HIRE_REQUIRES_OFFER`.
  - Rejected is a **status**, so the application keeps the stage it was rejected at, which the analytics need.
  - Jobs that have applications can no longer be deleted.
- **Pipeline board endpoint** (applications grouped by stage), team comments on applications, and a history endpoint.
- **Public "Apply" endpoint** (`POST /public/jobs/{slug}/apply`):
  - Multipart form with a CV.
  - The company is taken from the job. An existing candidate is matched by email within that company.
  - Rate limits: 5 per minute and 20 per hour per IP.
  - Consent is required. A honeypot field silently discards bot submissions.
  - A second application to the same job is rejected.
- **Demo seeder:** 10 fictitious candidates per open job, spread across every stage, with one rejection each.

**Frontend (verified: typecheck, lint, 47 tests and production build pass)**

- **Candidates:**
  - List with search and tag filter.
  - Detail page with applications, experience timeline, education, skills and tags, contact details, notes, and document upload/download/delete.
  - Create/edit drawer with experience and education entries and duplicate warnings while you type.
  - "Add to job" for existing candidates.
- **Applications:**
  - List with filters (job, stage, status, assigned to me or unassigned, search).
  - Detail page with a stage progress bar, a move form with a note, reject and reopen, a recruiter assignment select, history (`ActivityTimeline`), the cover letter and team comments.
- **Pipeline board** (`/applications/pipeline`, filter by job):
  - Drag and drop between stages, plus a card menu for keyboard and screen-reader users.
  - Moves show immediately and are undone if the API refuses them.
  - Cards can't be dropped on Hired.
- **Pipeline stages settings** (`/company/pipeline`).
- **Public Apply form** on each careers job page: CV drag-and-drop, client checks on file type and size, consent, honeypot, and a confirmation screen.
- **Reusable components:** `NotesPanel`, `ActivityTimeline`, `CandidateCard`, `FormDate`.

## 2. API endpoints added

| Area | Endpoints |
|---|---|
| Stages | `GET/POST /recruitment-stages`, `PUT/DELETE /recruitment-stages/{id}` |
| Candidates | `GET/POST /candidates`, `GET/PUT/DELETE /candidates/{id}`, `GET /candidates/duplicates`, `GET /candidates/{id}/applications`, `GET/POST /candidates/{id}/notes`, `POST /candidates/{id}/documents`, `GET /candidates/{id}/documents/{doc}/download`, `DELETE /candidates/{id}/documents/{doc}`, `GET /tags` |
| Applications | `GET/POST /applications`, `GET /applications/pipeline`, `GET /applications/{id}`, `POST /applications/{id}/stage`, `/assign`, `/reject`, `/reopen`, `GET /applications/{id}/history`, `GET/POST /applications/{id}/notes` |
| Public | `POST /public/jobs/{slug}/apply` |

## 3. Database changes

- New tables: `recruitment_stages`, `candidates`, `candidate_experiences`, `candidate_educations`, `candidate_skill`, `tags`, `candidate_tag`, `candidate_notes`, `candidate_documents`, `applications` (unique `job_posting_id + candidate_id`), `application_stage_history` (append-only) and `application_notes`.

## 4. Security considerations

- Candidates, documents, stages and applications are all filtered to the active company. Ids from another company are rejected by validation (stage, candidate, job, assignee) or return 404.
- Documents are private, randomly named, type-checked and downloaded only with authorization. Downloads are audited.
- Public applications: the company is never taken from the request; there are rate limits, a honeypot, required consent, and a database constraint against duplicates.
- Interviewers can't browse the talent pool or applications. Their limited access to the interviews they're assigned arrives in Phase 5.
- Notes, comments and cover letters are shown as plain text.

## 5. Tests added

- Backend: `CandidateTest`, `CandidateDocumentTest`, `ApplicationPipelineTest`, `PublicApplyTest`, `PipelineStagesTest`.
- Frontend: candidate schema, apply form validation, pipeline board (columns, accessible moves, permissions).

## 6. Deferred

- **Candidate portal** (candidate accounts, "my applications", profile and documents). It needs a candidate-facing authentication flow and is planned together with offer acceptance in Phase 5.
- New-application notifications: the events are already dispatched; notifications are delivered in Phase 6.

## 7. Known issues

- The board shows at most 1,000 active applications per view. Filter by job for large pipelines.
