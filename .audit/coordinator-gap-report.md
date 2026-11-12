# Coordinator dashboard gap report

The coordinator queue now shows open requests, open needs without an active helper, requests awaiting confirmation, urgent or critical requests, cases flagged for review, and distinct active helpers. Existing attention and unresolved report counts remain available. Closed and resolved cases are excluded from the new operational counts; closure is not treated as confirmation of help.

An active helper has an accepted, in-progress, or delivered commitment on an open request. An open need without an active helper has no commitment in those states, so a pending proposal does not imply an agreed assignment. The review count uses the existing `review` and `urgent_owner_review` follow-up flags; the projected snapshot does not expose the underlying review field. These flags follow existing threshold rules and do not represent every possible review decision.

The active-helper filter uses helper IDs from actual active commitments and combines with the queue's other filters. The former “Unassigned” coordinator preset and coordinator filter are labeled “No coordinator owner” to distinguish ownership from helper commitments. Ordinary requests do not require a coordinator owner.

Verification: `npm test -- --run tests/coordinator-overview.test.ts`, `npm test -- --run tests/coordinator-operations.test.ts tests/followup-operations.test.ts`, and `npm run typecheck` passed. No browser or build verification was performed within the assigned scope.

The “Needs helper” preset immediately finds open requests with at least one open need lacking an active commitment, independent of coordinator ownership and follow-up thresholds. The resource summary uses the existing coordinator dashboard listing counts, including its general eligibility checks; it does not add resource capacity units together.
