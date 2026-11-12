# Spanish intake fallback

The deterministic extractor recognizes bounded Spanish aliases for groceries, transport, supplies, shelter, and community; Spanish medical, missing-person, danger, and sensitive phrases also feed the independent safety flags. Matching removes accents only for comparison, while the original source text and matched timing phrase remain unchanged. Explicit `hoy`, `mañana`, and `esta semana`, numeric counts followed by `persona` or `personas`, and explicit wheelchair use or inability to walk are recognized. Approximate and conflicting counts remain unknown, as do quantities without a person unit.

Safety flags are merged independently with configured provider output. The fallback is a bounded phrase matcher, not a translator, and cannot recognize every dialect or paraphrase. Review remains necessary before saving.

Focused verification passed with `npx vitest run tests/spanish-intake.test.ts tests/intake.test.ts tests/intake-source-fields.test.ts tests/intake-preview.test.ts tests/network.test.ts`: 5 files and 42 tests. No production build, server, browser, external translation service, or model change was used.
