# Community Help Network agent configuration

This bundle contains only agent-specific overrides. The installed project copy is in `.codex/`. Primary model, primary reasoning effort, approval policy, sandbox, and general instructions inherit from the normal Codex configuration.

The configuration enables up to eight concurrent subagents, excluding the primary agent. Terra with high reasoning is the default subagent. The implementation, lightweight, and reviewer roles use Terra, Luna, and Sol respectively. Their files retain role-specific instructions and model settings. All roles inherit session permissions and sandbox settings.

Keep `config.toml` and the adjacent `agents/` files together when copying this bundle. The installed copy and this template have matching settings. Changes may require a new session to take effect; a running session's capacity is not established by the file alone. Host-managed limits still apply.
