## Tracker: DoneWhen

DoneWhen is the issue tracker. Use its MCP tools (`mcp__donewhen__*`) and the `donewhen` skill. Load the skill before any ticket work.

Flow: Triage → Backlog → Aligning → Ready → In Progress → Blocked → In Review → Done → Canceled.

Rules:
- Ask me to confirm the title and scope before you create a ticket or an epic.
- Give every ticket a done-when checklist of 3 to 6 items. Set it with `set_criteria`. Derive the items from the spec. Do not make generic items.
- Tick each item with `check_criterion` the moment it is met. Do not wait for the end.
- The checklist gates In Review and Done. If an item is not done, do not move the ticket.
- If you cannot finish without me, move the ticket to Blocked. Write the reason in a comment.
- I review all code. Never move a ticket to Done. Stop at In Review.
- When you finish: `link_commit`, `set_issue_dev`, then `save_document` with what changed and how.

Where things live:
- Workspace: `STN`
- Epics: `Company Platform v1 — Launch to Production>`
- Labels: one `type` label for each ticket (`bug`, `feature`, `chore`, `tech-debt`).


## Git workflow
- One branch per ticket, named <ticket-key>-<short-name> (e.g. s-2-backoffice), created from the latest main.
- Never commit directly to main.
- When the checklist is done, push the branch and open a PR to main, then record the branch and PR URL on the ticket and move it to In Review.
- I am on Windows PowerShell 5.1: give me commands one per line, no &&.