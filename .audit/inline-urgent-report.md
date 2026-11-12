# Inline urgent help intake

## Intended flow

The Disaster response action card opens the existing intake flow in a warm themed panel within the Disaster Hub. The existing analysis, review, timing confirmation, safety floor, and duplicate creation guard remain owned by `IntakeForm`. A successful submission shows a queue receipt and a user chosen “View request” link without redirecting away from the hub.

## Checks

- Urgent prefill is applied after analysis while `Critical review` remains dominant for safety flagged or critical cases.
- Embedded mode suppresses the standard right rail and page heading; default standalone intake behavior is preserved.
- Verified: `npm run typecheck` and `npx vitest run tests/intake-urgency.test.ts` both pass (2 tests).

## Visible interaction

Select the “Request urgent help” card to open the inline panel. Analyze a need, review the extracted details and safety status, choose and confirm a time window, then select “Create trackable request”. The hub displays “Request created”, confirms it was added to the response queue, and offers “View request” as an optional navigation action; “Close” dismisses the panel.
