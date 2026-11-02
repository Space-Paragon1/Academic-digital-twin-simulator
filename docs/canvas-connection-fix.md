# Canvas connection changes — November 2, 2026

## Reported failure

The user's screenshot showed `https://grambling.instructure.com/` and the app's
old "Invalid Canvas token" message. That address matches Grambling's official
Canvas resources. The old service emits that message only after a Canvas 401.
The screenshot does not establish why Canvas rejected the token. The separate
full-page-link bug found in the code does not explain this screenshot.

## Implemented locally

- Both import screens share a school picker. Grambling State University fills
  its verified Canvas site automatically; no manual address is needed.
- Other schools accept dashboard/course links or hostnames. The backend extracts
  the HTTPS origin before appending `/api/v1/courses`.
- Successful connections remember only the site in per-account browser storage.
  Tokens remain transient and are cleared from the form after fetching succeeds.
- Surrounding token whitespace and a pasted Bearer prefix are handled.
  Empty, multiline, and non-ASCII token inputs receive specific feedback.
- Authentication, permission, wrong-site, timeout, rate-limit, redirect, and
  unexpected-response failures have distinct messages.
- Pagination preserves next-page queries, rejects cross-origin/HTTP links, and
  stops repeated links or excessive requests. Requests do not follow redirects.
- Readable course records no longer disappear solely because workflow_state is
  absent. Explicit unpublished/completed records and ID-only entries are skipped.
- Private/loopback destinations are rejected during hostname validation.
- The frontend timeout is 60 seconds to accommodate the bounded pagination flow.

## Validation

- All 182 backend tests pass, including 35 new Canvas service tests using mocked
  HTTP responses and synthetic tokens.
- Next.js production build and TypeScript checks pass.
- The local form was inspected in the browser. Selecting Grambling fills the site
  and removes the manual URL field.
- No real Canvas token was obtained, saved, logged, or used in testing.

## Deployment and remaining verification

Deploy the frontend and backend changes together. The user must retry through
that deployed form to establish whether their actual token now works. A genuine
Canvas rejection may still require a valid replacement token or help from the
school's Canvas administrator; these changes cannot grant Canvas permissions.

The source includes unrelated, earlier local fixes for the obsolete guest link
and dark-mode report text; those changes were preserved.

References:
- https://www.gram.edu/offices/academic-support/distance-learning/studentres.php
- https://canvas.instructure.com/doc/api/file.oauth.html
- https://canvas.instructure.com/doc/api/courses.html
- https://canvas.instructure.com/doc/api/file.pagination.html
