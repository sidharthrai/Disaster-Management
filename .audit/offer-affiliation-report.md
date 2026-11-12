# Offer affiliation report

Normal and weekly scheduled offers accept an optional self-described organization affiliation. Input is trimmed, blank values normalize to absent, and values over 120 characters are rejected. Each scheduled offer stores the affiliation independently. Existing offers without the field remain valid. The owner sees the affiliation labeled as self-described and not verified or endorsed; form labels ask people not to include contact information and explain that eligibility is unchanged.

Affiliation is omitted from other members' offer snapshots and does not enter the public overview, matching eligibility or reasons, user verification, or qualifications. Existing offer routes and return-to-request flow remain unchanged.

Verification: `npm test -- tests/offer-affiliation.test.ts tests/offer-schedule.test.ts` passed (2 files, 6 tests), covering SQLite reopen, owner and non-owner projections, matching equality, unchanged user record, legacy offers, input limits, and scheduled offers. `npm run typecheck` was attempted while other feature work was in progress; it failed on missing intake-drafts and volunteers components and two gatherings type errors outside this scope. No build, server, browser, Git, or deployment actions were run.
