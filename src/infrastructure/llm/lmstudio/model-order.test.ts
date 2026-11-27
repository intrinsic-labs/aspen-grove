import { compareLMStudioModels } from './model-order';

const model = (id: string, displayName: string, loaded = true) => ({
  id,
  displayName,
  state: loaded ? ('loaded' as const) : ('not-loaded' as const),
});

describe('compareLMStudioModels', () => {
  it('keeps the chat fixture first when a base fixture is also loaded', () => {
    // `mock-base` sorts before `mock-model` by key, but its name is shown as
    // "Writing fixture (base)": the first loaded model must stay mock-model.
    const list = [
      model('mock-base', 'Writing fixture (base)'),
      model('mock-missing', 'mock-missing', false),
      model('mock-model', 'mock-model'),
    ].sort(compareLMStudioModels);
    expect(list.map((m) => m.id)).toEqual([
      'mock-model',
      'mock-base',
      'mock-missing',
    ]);
  });

  it('falls back to the key when names tie', () => {
    const list = [model('b', 'Same'), model('a', 'Same')].sort(
      compareLMStudioModels
    );
    expect(list.map((m) => m.id)).toEqual(['a', 'b']);
  });
});
