import { indexBufferGraph } from './buffer-graph';
import { id, link, textNode } from './buffer-graph-fixtures';
import { describeBufferChoices } from './buffer-choices';
import { resolveBufferPath } from './resolve-buffer-path';

// a -> (b | c | d), with b edited into b2; a -> b reaches b2 too.
const nodes = [
  textNode('a', 'A'),
  textNode('b', 'B', { at: 1 }),
  textNode('c', 'C', { at: 2 }),
  textNode('d', 'D', { at: 3 }),
  textNode('b2', 'B2', { at: 4, editedFrom: 'b' }),
  textNode('e', 'E', { at: 5 }),
];
const edges = [
  link('ab', ['a'], 'b', 1),
  link('ac', ['a'], 'c', 2),
  link('ad', ['a'], 'd', 3),
  link('ab2', ['a'], 'b2', 4),
  link('b2e', ['b', 'b2'], 'e', 5),
];
const graph = indexBufferGraph(nodes, edges);
const open = (...ids: string[]) =>
  resolveBufferPath(graph, ids.map(id), [], { kind: 'open' });

test('branch choices list the sibling families in order with the active one', () => {
  const resolved = open('a', 'b2', 'e');
  const at1 = describeBufferChoices(graph, resolved, 1);
  expect(at1.branches.entries.map((c) => c.nodeId)).toEqual([
    id('b2'),
    id('c'),
    id('d'),
  ]);
  expect(at1.branches.active).toBe(0);
  expect(at1.branches.entries[1].action).toEqual({
    kind: 'branch',
    position: 1,
    nodeId: id('c'),
  });
  const onC = describeBufferChoices(graph, open('a', 'c'), 1);
  expect(onC.branches.active).toBe(1);
  expect(onC.versions.entries).toHaveLength(1);
});

test('version choices are the reachable versions, oldest first', () => {
  const at1 = describeBufferChoices(graph, open('a', 'b2', 'e'), 1);
  expect(at1.versions.entries.map((c) => c.nodeId)).toEqual([
    id('b'),
    id('b2'),
  ]);
  expect(at1.versions.active).toBe(1);
  expect(at1.versions.entries[0].action).toEqual({
    kind: 'version',
    position: 1,
    nodeId: id('b'),
  });
});

test('the first position has versions but no branches', () => {
  const at0 = describeBufferChoices(graph, open('a', 'c'), 0);
  expect(at0.branches.entries).toEqual([]);
  expect(at0.versions.entries.map((c) => c.nodeId)).toEqual([id('a')]);
});

test('out of range positions offer nothing', () => {
  const none = describeBufferChoices(graph, open('a', 'c'), 5);
  expect(none.branches.entries).toEqual([]);
  expect(none.versions.entries).toEqual([]);
});

test('every listed action is one the resolver accepts', () => {
  const resolved = open('a', 'b2', 'e');
  for (let position = 0; position < resolved.nodeIds.length; position += 1) {
    const choices = describeBufferChoices(graph, resolved, position);
    // Selecting the active entry is a no-op the pill never sends.
    for (const set of [choices.branches, choices.versions]) {
      for (const [index, choice] of set.entries.entries()) {
        if (index === set.active) continue;
        const result = resolveBufferPath(
          graph,
          resolved.nodeIds,
          [],
          choice.action
        );
        expect(result.issues.map((i) => i.kind)).not.toContain(
          'action-rejected'
        );
      }
    }
  }
});
