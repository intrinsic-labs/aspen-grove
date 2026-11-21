import type { ModelRef } from '@domain/value-objects';

/**
 * A readable name from a model identifier: its last path segment
 * (`qwen/qwen3-8b` → `qwen3-8b`, `anthropic/claude-haiku-4.5` →
 * `claude-haiku-4.5`), or the whole identifier if it has none.
 */
export const readableModelName = (identifier: string): string => {
  const trimmed = identifier.trim();
  const lastSegment = trimmed.split('/').filter(Boolean).pop();
  return lastSegment ?? trimmed;
};

/**
 * The name of an agent made for a model: the model's display name when the
 * caller knows it (OpenRouter's catalog name, as Latent Spaces addresses a
 * tree's model: "Reply to \(tree.model.getName())", LoomTreeView.swift:88),
 * else a readable form of its identifier. Never the tree's title: a new
 * tree's title is a timestamp placeholder until it is auto-titled.
 */
export const modelAgentName = (
  modelRef: ModelRef,
  modelName?: string
): string =>
  modelName?.trim() ||
  readableModelName(modelRef.slice(modelRef.indexOf(':') + 1));
