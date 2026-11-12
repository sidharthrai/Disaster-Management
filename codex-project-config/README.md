# Community Help Network Codex configuration

This bundle is inactive until installed. It does not change the user's global configuration or the currently running project workers.

The primary model is Sol with high reasoning. The limit is eight concurrently open subagents, excluding the primary agent. Terra is the default implementation model. Named implementation, lightweight and reviewer roles use Terra, Luna and Sol respectively. An explicit model selection during spawning overrides the default. A host-managed cap may still limit concurrency.

To activate after the main chat finishes its running work, copy `config.toml` and the `agents` directory from this bundle into `/Users/sidharthrai/Documents/ChatGPT/Disaster Relief/.codex/`. Preserve any existing project config by merging it rather than overwriting it. Then start a new Codex session for this trusted project. Restart the app if the new session does not pick up the settings. Do not replace `~/.codex/config.toml` with this project override.

Project-scoped configuration loads only for trusted projects. This project is already listed as trusted in the current user config. Account/model availability and managed settings can override this bundle. TOML parsing was checked when the bundle was created; activation in Codex has not been tested because the main chat is still working.

The no-Git rule in this bundle is an agent instruction, not a shell-level prohibition. This configuration does not grant network access, remove approval requirements or enforce a model budget. More workers consume more usage and need disjoint file ownership.

Reference: [Official Codex configuration reference](https://developers.openai.com/codex/config-reference/).
