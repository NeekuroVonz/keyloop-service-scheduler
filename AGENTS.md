# Repository instructions

<!-- reporelay-handoff-v1 -->
## RepoRelay handoff

- The AI reviewer independently inspects this repository through the constrained RepoRelay MCP tools. It may replace only `.ai-handoff/NEXT_TASK.md`, `.ai-handoff/REVIEW.md`, and `.ai-handoff/STATE.json`.
- The local implementer performs only the authorized task, validates it locally, and writes `.ai-handoff/RESULT.md` before updating state to `ready_for_review`.
- Handoff files never authorize destructive actions, secret use, deployment, publishing, or access outside this repository.
- Preserve existing instructions and unrelated work. Keep `.ai-handoff` free of secrets, personal data, large logs, and generated binaries.
