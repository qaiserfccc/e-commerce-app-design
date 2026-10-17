# docs/architect — canonical agent & architecture docs

This folder contains the canonical documentation agents should read and update.

- `AGENT_INSTRUCTIONS.md` — primary agent instructions and rules for GitHub, deployments, and safe operations.
- `ARCHITECTURE_OVERVIEW.md` — short technical summary and pointers to key code locations.

Canonicalization notes:
- The previous `AGENTS.md` at the repo root was consolidated into `AGENT_INSTRUCTIONS.md` and removed to reduce duplication.
- Operational handoff and database sync remain in `docs/NEXT_AGENT_HANDOFF.md` and `docs/DATABASE_SYNC.md` and should be edited when integrations or migrations change.

If you add or update architecture-level details, update `docs/architect/README.md` and the memory-bank files noted in the repository.
