# Correction refresh merge fix

- Correction fields now retain only deliberately edited values. Pristine categories, neighborhood, urgency, and window controls reflect current detail, and submission merges the current request with those drafts. Untouched timestamps retain the latest exact ISO values, including seconds and milliseconds.
- Successful corrections retain drafts until refreshed detail matches the saved result, including server-enforced critical urgency; all correction controls, including the reason, are disabled while a save is in flight so its submitted draft can be acknowledged safely. The ownership selector similarly follows refreshed ownership until edited and waits for matching detail after a save. Other case drafts are untouched.
- Validation: `npx vitest run tests/frontend-state.test.ts` passed (5 tests); `npm run typecheck` passed. Vitest emitted its existing Vite configuration deprecation warning. Browser verification remains with the parent task.
