# Architect Docs

This folder holds the canonical documentation agents should read and update.

## Contents

- `AGENT_INSTRUCTIONS.md` — agent rules for GitHub, deployments, database and safe operations.
- `ARCHITECTURE_OVERVIEW.md` — short technical summary and pointers to key code.

## Canonicalization notes

- The former root `AGENTS.md` was consolidated into `AGENT_INSTRUCTIONS.md` and removed.
- Operational handoff and database sync stay in `docs/NEXT_AGENT_HANDOFF.md` and `docs/DATABASE_SYNC.md`. Update them when integrations or migrations change.

When architecture-level details change, update this folder and the files in `memory-bank/`.
