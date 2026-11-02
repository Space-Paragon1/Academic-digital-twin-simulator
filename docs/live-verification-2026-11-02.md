# Live deployment verification

Checked the Vercel frontend and Railway API on November 1–2, 2026.

- Frontend: https://academic-digital-twin-simulator.vercel.app
- API: https://academic-digital-twin-simulator-production.up.railway.app
- Deployed baseline: local checkout was clean at `7e2739d` before the UI fixes below.

## API checks — 24 passed

Two disposable accounts exercised registration, login, profile update, course creation,
simulation execution, history retrieval, and reopening a saved result. Requests from
the other account could not read or edit the profile, list courses, delete a course,
read or delete the simulation, or write a simulation note. The reverse profile check
also returned 404. Anonymous simulation access returned 401; ordinary-account admin
listing returned 403. The owner could still retrieve the result after these attempts.
The Vercel-origin CORS preflight passed.

Both accounts were deleted in a finally block, including their cascading test data.
Their old tokens then returned 401. No credentials were logged or saved by this run.

## Browser workflow — passed

A separate temporary account was registered in the live frontend. The profile name
was edited successfully, and a course was added. The profile and course persisted
when the session resumed the next day. A Light preset simulation was run with that
course, appeared in History, and reopened as a full report with charts and snapshots.
The account was then deleted using Settings; the application signed out and returned
to the landing page. Its test course and simulation were covered by account deletion.

## UI defects fixed locally

- Login advertised a guest bypass based on a stored student ID, despite the APIs now
  requiring authentication. Replaced it with a link to the public How It Works section.
- The report heading and primary summary values used dark text on dark backgrounds.
  Added dark-theme text colors, including the Monte Carlo median and burnout values.

These UI fixes are local and require deployment. The original live report screenshot
shows the contrast issue; it is not a screenshot of the fixed version.

## Limits and remaining work

This is a focused smoke test, not an exhaustive audit. It does not verify backup
configuration, restore capability, or persistence across a Railway redeployment.
Railway's database settings and backup schedule still need dashboard verification.
Email delivery, Canvas import, AI advice, and all model predictions were not tested.
The previously identified variable-sleep Monte Carlo, extracurricular accounting,
and history-after-50-runs issues remain for the next correctness pass. CI has not
been added as part of this verification.
