# Frontend design exploration

## Current deliverable: connected A-to-B HTML prototype

Open [prototype.html](prototype.html) or http://127.0.0.1:4173/prototype.html. A is the public homepage; B is the signed-in community dashboard, restyled with A’s green identity. These are design screens, not the production frontend. No React, Next.js, shadcn/ui, Astryx, AI service, database, or application server is used by the prototype.

Walkthrough: Demo sign in → Continue as Mira → Ask for help → Use the grocery example → Organize my request → Review details → Post my request → Invite Eli → Preview Eli’s response → Accept invitation → Add a fictional private coordination message → Start grocery pickup → Report groceries delivered → Preview Mira’s confirmation → Confirm receipt → Return to dashboard.

The grocery journey uses browser-tab session storage when available and in-memory state otherwise. Reset journey clears the fictional request, messages, timeline, and demo identity. No message is transmitted. Do not enter real personal details. Persona switching is a design-preview control, not authentication or access protection.

Also previewable: declined invitations, cancellation/reopening, missing-match behavior for incompatible areas/timing, search/filter empty states, and an unconfirmed outcome that remains flagged for follow-up. Resources are illustrative listings. Publishing offers, coordinator operations, Emergency Mode, and real account workflows remain later design passes.

Source files: prototype.html, prototype.css, journey.js (browser demonstration state), prototype.js (screens and interaction controller), and locally bundled font/illustration assets.


These are standalone HTML/CSS/JavaScript mockups. They do not use Next.js, SQLite, APIs, production accounts, or the experimental application scaffold elsewhere in the project. All people, numbers, and activity are synthetic. The original A/B/C comparison pages preview visual states only. The connected prototype retains fictional progress in browser-tab storage; nothing is sent to a server.

## Open the comparison gallery

From the project root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory public/mockups
```

Open http://127.0.0.1:4173/. The gallery can also be opened directly from index.html without a server; fonts and mockups are local files.

## Directions

- A — Neighborhood: welcoming green palette, neighborhood illustration, top navigation, two-column request feed.
- B — Community desk: terracotta accent, sidebar workspace, open request list, partner/resource context.
- C — Shared ground: dark green introduction, relationship illustration, mission-led copy, open request rows.

Each direction includes responsive layout, request-category filtering, preview request/offer dialogs, and an Emergency Mode visual toggle. The gallery switches between designs and desktop/mobile preview sizes. Motion respects reduced-motion preferences. Fonts are bundled locally under assets.

The user selected A for the homepage and B for the signed-in dashboard, with A’s green identity throughout. The current next step is reviewing the connected prototype together. Application/backend implementation remains paused.

## Verification completed

The connected prototype passed JavaScript syntax checks and a browser walkthrough of homepage → demo sign-in → dashboard → grocery request → review → suggestion → requester invitation → helper acceptance → local coordination message → started assistance → delivery report → requester confirmation → updated dashboard. The helper view did not expose the original message or a receipt-confirmation action. The conversation input was absent before agreement and after cancellation. A deliberately incompatible area produced no suggested match. Reset cleared the journey, and refresh preserved the fictional tab session.

Desktop was checked at 1440 pixels. Homepage, dashboard, request form, review, and case outcome were checked at 390 pixels with no horizontal page overflow. These checks validate a design prototype, not production authorization, privacy, matching quality, real AI, or messaging delivery.
