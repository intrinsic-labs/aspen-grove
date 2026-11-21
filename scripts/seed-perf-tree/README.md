# seed-perf-tree

Builds a 500+ node Open Loom tree for performance testing: a deep main path
(40+ turns), side branches and six bushy regions (3-4 siblings, each continued),
alternating human and model turns. Model turns are either lorem-style fake text
(`--fake`, offline, free) or real replies from Claude Haiku through OpenRouter.

Needs Node 22.18 or newer (runs the `.ts` files directly; no extra dependencies).
The shape, human prompts and fake text are fully determined by `--seed`.

## Generate

```sh
# Offline, free, deterministic (good enough for most render/scroll timing):
node scripts/seed-perf-tree/cli.ts --fake

# Real content. Without --yes it only prints the plan and a cost estimate:
export OPENROUTER_API_KEY=...        # environment only; never written to disk
node scripts/seed-perf-tree/cli.ts --seed 1
node scripts/seed-perf-tree/cli.ts --seed 1 --yes
```

Output goes to `scripts/seed-perf-tree/out/` (gitignored):
`perf-tree-<seed>-fake.openloom` or `perf-tree-<seed>-llm.openloom`.

Options: `--seed` (1), `--nodes` (520), `--depth` main-path depth (40),
`--concurrency` (4), `--model` (`anthropic/claude-haiku-5.5`),
`--price-in` / `--price-out` USD per million tokens used for the estimate
(0.10 / 0.50), `--reasoning-headroom` tokens added to each call's `max_tokens`
(1024), `--reasoning-expected` reasoning tokens a call is estimated to spend
(100), `--out` file path.

**Reasoning models.** Haiku 5.5 thinks before it answers, and OpenRouter counts
those hidden tokens against `max_tokens`: sized for the reply alone, replies came
back cut short or empty. Claude's reasoning can't be switched off through
chat-completions, so each call gets `--reasoning-headroom` on top of the reply's
budget (a cap; only what the model spends is billed), and the estimate counts
`--reasoning-expected` per call as output, plus a ceiling if every call used its
whole headroom. A reply that comes back empty or cut short is asked for again,
up to three times; a cut-short one is then kept with a warning, an empty one
stops the run (the cache keeps what is done). The run ends by printing the
output and reasoning tokens OpenRouter reported. Replies cached before this
change by a haiku-5.5 run may be truncated: delete that cache file to redo them.

Real runs are resumable: every reply is appended to
`out/cache-<seed>-<model>.jsonl` as it arrives, keyed by the node's recipe and
ancestry. A crash, Ctrl-C or rerun reuses cached replies and spends only on the
rest. Delete the cache file to regenerate. Changing `--seed`, `--nodes`,
`--depth` or `--model` makes a different tree with its own keys.

## Import into the app

Copy the file to the simulator or device (drag it onto the simulator, or AirDrop
or Files), then on Home: `home-menu-button` > "Import OpenLoom Tree" > pick the
`.openloom` file. An "Import complete" alert reports the tree and node count. See `trees.import` in `FEATURE_MAP.md`.

## What to time

The imported tree opens on its deepest path (about 45 messages).

1. **Open the tree:** tap `home-trees-row-<treeId>` on Home
   until `chat-message-list` has rows.
2. **Scroll to the bottom:** fling `chat-message-list` up and down end to end;
   watch for dropped frames with long markdown and code messages.
3. **Switch branch:** tap a message row `chat-message-row-<role>-<nodeId>` that has
   siblings to open its continuation rail, then double-tap a card
   `chat-continuation-card-<nodeId>` (or long-press > "Make Current Node").
   The path should re-point and the list re-render.
4. **Open continuations:** tap a row in the bushy regions (3-4 children) and
   time `chat-continuation-rail` appearing and scrolling
   (`chat-continuation-rail-list`). A single tap waits 320 ms to rule out a
   double-tap.

Also worth a look: search (`home-menu-button` > "Search") for a common word, and the
bookmarks sheet (a few nodes are pre-bookmarked).
