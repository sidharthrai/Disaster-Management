# Active granular feature ownership

The user authorized Git and expanded the running session to eight subagents. Root alone owns Git operations and integration. All writers share a checkout and must preserve one another's changes.

| Agent | Concrete feature | Exclusive files |
| --- | --- | --- |
| coordinator_domain | Coordinator ownership, corrections, private notes, command integration, projections and migration | model/inputs/commands/views/network/seed, repository, command route, coordinator tests |
| followup_domain | Follow-up predicates, episode reconciliation and notification generation | followup.ts, notifications.ts, follow-up and notification tests |
| resource_incident_domain | Resource catalog policy, specialized eligibility and incident aggregate math | resources.ts, emergency.ts, matching.ts, resource/incident tests |
| coordinator_case_ui | Coordinator queue filters, case editing and follow-up actions | coordinator.tsx, coordinator-case.tsx, request-detail.tsx, coordinator page |
| operational_screens_ui | Emergency view, resource forms, inbox, settings and offer availability | dedicated emergency/resources/notifications/settings/offers components and new emergency/inbox pages |
| account_login_deployment | Real login/session isolation, account provisioning and deployment package | auth/session/services helpers, auth endpoints/pages/controls, account tests/scripts, Docker files, env example |
| integration_workflows | Repeatable HTTP workflow verification | operations-check.mjs, accounts-check.mjs and optional e2e files |
| completion_documentation | Setup, short demo and deployment instructions | README.md, docs/demo.md, docs/deployment.md |
| root | Shared UI wiring, navigation, styles, dependencies, configuration, review and real runtime checks | screens/workspace integration, package/config, status/audit docs, Git |

Reviewers replace completed workers as slots become free. Passing a worker's checks does not replace independent review or root runtime verification.
