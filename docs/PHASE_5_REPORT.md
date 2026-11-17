# Phase 5 Report: Interviews, Offers and Candidate Portal

## 1. What was implemented

**Backend (written; tests not yet run because Composer packages can't be installed here)**

- **Interviews:**
  - Four types (HR, technical, behavioral, final), stored in UTC along with the organiser's timezone. Each has a duration (15–480 min), a meeting link (https only) and/or a location, an agenda, and 1–10 interviewers.
  - Interviewers must be active members of the company with interview permission.
  - Scheduling conflicts are detected: if an interviewer is already booked at an overlapping time, the API returns `SCHEDULE_CONFLICT`. The scheduler can still choose "schedule anyway".
  - Interviews can be rescheduled (audited) and cancelled with a reason. They can be marked completed after the start time, and are marked completed automatically once every interviewer has submitted feedback.
  - **Interviewers see only the interviews they are part of.** They can download the candidate's CV through the interview, but they still can't browse the talent pool.
- **Feedback:**
  - Ratings from 1 to 5 for technical skills, communication, problem solving and overall, plus a recommendation and comments.
  - Only participants can submit, only after the interview starts, and they can revise their own.
  - **Feedback is blind:** an interviewer sees colleagues' feedback only after submitting their own. Schedulers always see all of it.
- **Offers** with the approval step agreed in Phase 1:
  - Draft → Pending approval → Approved → Sent → Accepted / Declined / Expired. Offers can be withdrawn at any open step, and an approver can send one back to draft with a comment.
  - One open offer per application.
  - Four-eyes rule: the author can't approve their own offer, except a Company Admin (for small teams).
  - The response deadline must fall before the start date.
  - **Sending** emails the candidate a private link (64-character token, stored only as a hash) and moves the application to the Offer stage.
  - **Accepting** (from the link, the candidate portal, or a recruiter recording a verbal yes) marks the application **Hired** in the same transaction. This is the only route to Hired.
  - Late responses and the `offers:expire` scheduler (every 15 min) mark offers expired.
- **Candidate portal:**
  - Candidates register at `/candidate/register` and get a platform-level Candidate role, so they belong to no company.
  - **After email verification**, every candidate record with that email (across companies) is linked to the account. A later careers-page application with the same email is linked automatically.
  - The portal shows applications as candidate-friendly progress (received → in review → interviewing → offer → hired / not selected). Internal stage names, rejection reasons, notes and staff are never exposed.
  - Candidates see upcoming interviews with their meeting links, and can accept or decline offers.
  - They can edit their profile (applied to every linked record), list and download their documents, and share an updated CV with one chosen company.
  - Staff accounts can't use portal routes (`NOT_A_CANDIDATE`), and candidates can't use company routes.
- **Demo data:**
  - Interviews for applications in the interview and assessment stages: past ones with feedback, upcoming ones without.
  - Offers at the draft, approved and sent steps.
  - A portal account `candidate@example.test` / `Password123!` linked to a candidate with a sent offer.

**Frontend (verified: typecheck, lint, 54 tests and production build pass)**

- **Interviews:**
  - List with Upcoming / Past / Cancelled views and an "only mine" switch for schedulers. Calendar month view with popovers.
  - Detail page: agenda, candidate and CV download, logistics, interviewer feedback status, your feedback form (star ratings and recommendation), the blind-feedback message, and reschedule / mark completed / cancel.
- **Scheduling dialog** (opened from the application): date and time picker in the local timezone, interviewer picker, link or location, and a "schedule anyway" option when there's a conflict.
- **Offers:**
  - List and detail pages with a progress bar.
  - Each action is shown only when both the status and the user's permissions allow it: submit, approve / request changes, send (with confirmation), record acceptance or decline, withdraw.
  - Offer form dialog with validation (deadline before start date). Interviews and offers also appear on the application page.
- **Public offer response page** (`/offers/respond/:token`): terms, optional message, accept or decline, then a confirmation screen.
- **Candidate portal:**
  - Separate layout with candidate sign-in and registration.
  - Dashboard with offers awaiting an answer, upcoming interviews and application progress.
  - Applications list and detail (progress steps), documents, and profile with password change.
- Candidate accounts are routed to their portal; staff accounts to the company app.

## 2. API endpoints added

| Area | Endpoints |
|---|---|
| Interviews | `GET/POST /interviews`, `GET/PUT /interviews/{id}`, `POST /interviews/{id}/cancel`, `/complete`, `GET/POST /interviews/{id}/feedback`, `GET /interviews/{id}/documents/{doc}/download`, `GET /company/interviewers` |
| Offers | `GET/POST /offers`, `GET/PUT /offers/{id}`, `POST /offers/{id}/submit`, `/approve`, `/return`, `/send`, `/accept`, `/reject`, `/withdraw` |
| Public | `GET /public/offers/{token}`, `POST /public/offers/{token}/accept`, `/decline` |
| Candidate portal | `POST /candidate/register`, `GET /candidate/applications`, `GET /candidate/applications/{id}`, `GET /candidate/offers`, `POST /candidate/offers/{id}/accept`, `/decline`, `GET/PUT /candidate/profile`, `GET/POST /candidate/documents`, `GET /candidate/documents/{id}/download` |

## 3. Database changes

- New tables: `interviews`, `interview_participants`, `interview_feedback` (unique per interviewer) and `offers` (response token stored as a hash).
- Candidate portal accounts use the existing `candidates.user_id` link and the Candidate role in the platform scope.

## 4. Security considerations

- Interviewers are limited to their own interviews; feedback is blind until submitted; CVs are downloaded through the interview only.
- Offer response links are random, hashed and limited to one purpose. Candidates never see internal notes, approvals or staff names.
- Approval needs a second person (except Company Admins). Hiring happens only through an accepted offer, inside a transaction.
- Candidate records are linked to a portal account only after email verification, and every portal query is limited to the user's own records across companies.
- Rate limits on registration, offer responses and uploads.

## 5. Tests added

- Backend:
  - `InterviewTest`: conflicts, validation, interviewer visibility, CV access, blind feedback, auto-completion, reschedule/cancel.
  - `OfferWorkflowTest`: full approval → send → accept → hired flow, offer stage, decline, expiry, one open offer, self-approval rule, isolation, invalid tokens.
  - `CandidatePortalTest`: verification-gated linking, hidden rejection details, own records only, staff blocked.
- Frontend: offer schema, offer action permissions, feedback validation, candidate redirect.

## 6. Remaining work

- Phase 6: dashboard and analytics; in-app and email notifications (the events are already dispatched); interview reminders.
- Phases 7–8: Playwright end-to-end tests, Docker, CI wiring, deployment, Swagger annotations for every endpoint.
