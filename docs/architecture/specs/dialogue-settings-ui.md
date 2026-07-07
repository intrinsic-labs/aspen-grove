# Dialogue Settings UI

> Chat-side per-tree agent settings (the ⚙️ sheet). Implements Phase 4 of
> `.dev/agent-centric-dialogue-settings.md`.

**Status**: Implemented

## Overview

Every dialogue tree references a model Agent (`LoomTree.defaultModelAgentId`).
The chat header's settings button opens a sheet that exposes that agent and
the tree-level system context without leaving the conversation.

Components (`src/interface/components/chat/dialogue-settings/`):

- `DialogueSettingsSheet` — a page-sheet modal with three internal modes
  (overview / edit agent / switch agent). Mode switching happens inside one
  modal rather than stacking modals, which is unreliable cross-platform.
- `useDialogueSettingsController` — loads the tree + agent + shared-agent
  list, exposes the mutation actions, and calls `onSessionInvalidated` after
  any change that affects generation.

The form internals (`ModelPickerField`, `AgentConfigFields`,
`AgentDraft` validation) are shared with the Settings → Agents library editor.

## Shared vs tree-owned editing

- **Tree-owned agent** (`ownerTreeId === treeId`): "Edit agent" opens the
  editor directly. Saves go through `UpdateAgentConfigurationUseCase` and
  affect only this tree.
- **Shared agent** (`ownerTreeId === null`): "Edit agent" first prompts with
  the number of *other* active trees referencing the agent
  (`ILoomTreeRepository.findByDefaultModelAgentId`) and two choices:
  - **Edit shared agent** — mutates the library agent; changes propagate to
    every referencing tree.
  - **Customize for this tree only** — `ForkAgentForTreeUseCase` clones the
    agent into a tree-owned copy, re-points the tree, then opens the editor
    on the fork.

## Switch agent

Lists shared model agents (excluding the current one); selecting one calls
`UpdateTreeDefaultAgentUseCase`. Conversation history is unaffected — only
future generations use the new agent. Ad-hoc agents cannot be created from
scratch here; forking a shared agent is the only path to a tree-owned agent.

## Tree system context

`LoomTree.systemContext` is editable from the overview mode with an explicit
save. It combines with the agent's `systemPrompt` at context-assembly time
(agent-level first, then tree-level; see `context-assembly.md`).

## Session refresh

After any mutation (agent config, model switch, fork, system context), the
sheet calls back into the chat controller, which re-runs
`initializeDialogueChatSession` to re-resolve the provider, model identifier,
and agent binding. The ephemeral-tree flag is preserved across this
re-initialization so an active conversation is never mistaken for an empty
quick-add tree by the delete-on-back hook.
