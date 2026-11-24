---
name: gh-stack
description: Load this skill before you create, update, or merge pull requests that depend on each other, such as a pull request whose base is another pull request's branch, before you split work into several pull requests for review, or when the Git directory has a gh-stack file or the task names gh stack or stacked PRs. Covers creating a stack, adopting existing branches, adding layers, changes to a lower layer, submit, sync after a squash merge, merging a stack, rebase conflicts, worktrees, and exit codes.
license: MIT
metadata:
  author: flowcopilot
  upstream: github/gh-stack@80b6d6e910cc1b7eaa26b961d7721ade21084fed
  upstream_version: "0.2.0"
---

<!-- Modified by Flow Copilot from github/gh-stack. -->

# gh stack

`gh stack` is a GitHub CLI extension for stacked pull requests. A stack is a chain of branches on a trunk. Each branch has one pull request, and the base of that pull request is the branch below it. `gh stack` prints a stack bottom first: `(main) <- auth <- api`. `auth` is the bottom. It is based on `main` and merges first. `api` is the top. `gh stack up` moves toward the top, and `gh stack down` moves toward the trunk.

Let `gh stack` set the base of each pull request and rebase each layer. Do not set a base to another pull request's branch with `gh pr create` or `gh pr edit`, and do not rebase or cherry-pick the layers by hand.

## Run the forms that do not prompt

Under a terminal, a bare command opens a prompt or a full-screen TUI and waits forever. Always run the form in the first column.

| Run | Never run | Why |
|---|---|---|
| `gh stack view --json` | `gh stack view` | Opens a TUI. |
| `gh stack submit --auto` | `gh stack submit` | Prompts for the title of each new pull request. |
| `gh stack merge <target> --yes` | `gh pr merge` | `gh pr merge` cannot merge a stack. |
| `gh stack init <branch>...` | `gh stack init` | Prompts for branch names. |
| `gh stack add <branch>` | `gh stack add` | Prompts for a name. |
| `gh stack checkout <target>` | `gh stack checkout` | Opens a menu. |
| `gh stack up`, `down`, `top`, or `bottom` | `gh stack switch` | Menu only. |
| None | `gh stack modify` | TUI only. |

`gh stack <command> --help` is the authority for flags. `gh stack help <command>` prints only the top-level help.

`gh stack view --json` writes JSON to stdout and status messages to stderr. Parse only the JSON, and use the exit code to find a failure. `branches[].needsRebase` is true when a branch no longer contains the tip of its parent. `branches[].pr.state` is `OPEN`, `MERGED`, or `QUEUED`.

## Start a stack

Create the stack before you write code. Put one dependent concern in each layer, bottom to top. Read [stack-design](references/stack-design.md) to choose the layers.

```bash
gh stack init auth          # create the stack and check out auth
git add <paths> && git commit -m "Add auth middleware"
gh stack add api            # next layer, branched from auth
git add <paths> && git commit -m "Add API routes"
gh stack submit --auto      # push every branch and open draft pull requests
gh stack view --json        # confirm the order and the pull requests
```

## Adopt existing branches

A pull request whose base is another pull request's branch is a stack that `gh stack` does not track yet. Adopt the branches bottom to top, then let `submit` set each base and link the stack on GitHub:

```bash
gh stack init [--base <trunk>] <bottom> ... <top>
gh stack submit --auto
```

`init` adopts branches that exist, and the open pull requests stay. `init` changes only the stack metadata, not Git ancestry. When `gh stack view --json` shows `needsRebase` for a branch, run `gh stack rebase` before `submit`.

To reorder or rename layers, run `gh stack unstack`, fix the branches and their Git ancestry, then run `init` and `submit --auto` again. `gh stack modify` is TUI only. The full recipe is in [troubleshooting](references/troubleshooting.md#restructuring-a-stack).

## Change a lower layer

Commit a change on the layer that owns it, not on the top branch. Find the owner with `gh stack view --json`, or with `git log --all -- <path>`.

```bash
gh stack checkout auth      # or gh stack down
git add <paths> && git commit -m "Fix token expiry"
gh stack rebase --upstack   # replay every branch above onto the change
gh stack top
gh stack push
```

## Sync and merge

```bash
gh stack sync               # fetch, rebase onto the trunk, push, refresh pull request state
gh stack sync --prune       # also delete local branches of merged pull requests
gh stack merge 42 --yes     # merge pull request 42 and every unmerged pull request below it
```

- After a squash merge on GitHub, run `gh stack sync`. It skips the merged branch and rebases the layers above it.
- When the local stack and the stack on GitHub diverge, `sync` changes nothing and exits 0 with `Sync aborted`. Look for that message in the output. Then follow [troubleshooting](references/troubleshooting.md#local-and-remote-stacks-have-diverged).
- `gh stack merge` merges all of its pull requests or none. A stack number as the target merges the whole stack. Without `--squash`, `--merge`, or `--rebase`, it uses the last merge method again.

## Act on these exit codes

| Code | Meaning | Action |
|---|---|---|
| 3 | Rebase conflict | After `gh stack rebase`: resolve the files, run `git add`, then run `gh stack rebase --continue`. `gh stack rebase --abort` restores every branch. After `gh stack sync`: the stack is already restored. Run `gh stack rebase` to get the conflict again, then resolve it the same way. |
| 6 | The branch is in more than one stack, usually as their trunk. | Check out a branch that only one stack has, or give a stack number, as in `gh stack merge 7 --yes`. |
| 7 | A rebase is in progress. | Run `gh stack rebase --continue` or `gh stack rebase --abort`. |
| 8 | Another `gh stack` process has the lock on the stack file. | Wait about 5 seconds, then try again. Do not delete the lock files. |
| 9 | Stacked pull requests are not enabled on the repository. | Stop and tell the user. |

For another code, read stderr and the exit codes in [gh-stack](references/gh-stack.md#exit-codes).

## Worktrees

- All linked worktrees of a clone share one stack catalog.
- Navigation does not take over a branch that another worktree has checked out. To find that worktree, add `--print-path` and use stdout only on success: `path=$(gh stack checkout api --print-path) && cd -- "$path"`.
- `rebase` and `sync` update only clean worktrees, and they never stash. Commit the changes in a dirty worktree first.

## References

- [stack-design](references/stack-design.md): read before you plan a new stack, to choose the layers, name the branches, and decide when work needs its own stack.
- [troubleshooting](references/troubleshooting.md): read on a rebase conflict, after a squash merge, when the local and remote stacks diverge, before you restructure a stack, or when jj, Sapling, or git-town manage the branches.
- [gh-stack](references/gh-stack.md): the complete upstream skill. Read it for setup, more than one remote, merge queues, the full JSON fields, and the other exit codes.
