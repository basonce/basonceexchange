---
name: basonce GitHub mirror push requirement
description: This repl has a completion validation that requires mirroring local master to a GitHub repo; how to satisfy it.
---

# basonce GitHub mirror push (completion gate)

A configured completion validation (code-review verdict) REJECTS the task unless
the GitHub repo `basonce/basonceexchange` `refs/heads/main` equals the local
`master` HEAD.

**Rule:** before finishing, push local `master` to GitHub `main`.

**Why:** the project mirrors to GitHub; the validator runs `git ls-remote` and
compares the hash to local `master`. A behind/absent `main` fails completion.

**How to apply:**
- Auth with the `GITHUB_TOKEN` env secret via an inline, non-persisted credential
  helper — never print/echo the token, never write it to disk:
  `git -c credential.helper='!f(){ echo username=x-access-token; echo "password=$GITHUB_TOKEN"; }; f' push https://github.com/basonce/basonceexchange.git master:main`
- A non-force `git push` is allowed for the main agent directly (only force-push /
  commit / reset etc. are gated).
- **Timing trap:** the platform makes the task commit DURING `mark_task_complete`,
  THEN runs validation. So the push must include that final commit. Practical flow:
  let a first `mark_task_complete` create the commit + fail the GitHub check, then
  push that exact HEAD, then call `mark_task_complete` again with NO further file
  changes (clean tree → no new commit → GitHub == HEAD → passes). Do not edit any
  files (incl. memory / commit message) between the failing call and the final one.
- Verify: `git rev-parse master` must equal
  `git ls-remote https://github.com/basonce/basonceexchange.git refs/heads/main`.
