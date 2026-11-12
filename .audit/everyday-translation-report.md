# Everyday screens translation audit

The request detail, offers, weekly offer schedule, group activities, volunteer directory, community activity, and supplies board use the shared locale provider for their static labels, controls, empty states, known status and category values, and known application-generated messages. Dates use the selected locale. Selection controls preserve their original values while presenting translated labels, and user-supplied messages, names, notes, descriptions, and affiliations remain unchanged.

Matching explanations, known case timeline entries, safety flags, and follow-up descriptions have Spanish presentation mappings. Unknown server errors and unrecognized backend-generated text retain the original text through the shared translation fallback. Request titles and summaries remain as received because they may contain user content. Coordinator case controls are owned separately.

Verification: `npm run typecheck` passed. `npx vitest run tests/translations.test.ts tests/gatherings.test.ts tests/volunteers.test.ts tests/community-activity.test.ts tests/donations.test.ts tests/offer-schedule.test.ts` passed (6 files, 17 tests). No browser, build, or server verification was performed within this scope.
