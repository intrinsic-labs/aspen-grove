import { describe, expect, it } from '@jest/globals';
import { createStreamDiagnostics } from './stream-diagnostics';

const clock = (times: number[]) => {
  const queue = [...times];
  return () => {
    const next = queue.shift();
    if (next === undefined) {
      throw new Error('clock exhausted');
    }
    return next;
  };
};

describe('createStreamDiagnostics', () => {
  it('reports no first delta when nothing streamed', () => {
    const diagnostics = createStreamDiagnostics(clock([1000, 1250]));
    expect(diagnostics.summary()).toEqual({
      deltaCount: 0,
      msToFirstDelta: null,
      msTotal: 250,
    });
  });

  it('times the first delta and counts every delta', () => {
    const diagnostics = createStreamDiagnostics(clock([1000, 1040, 1900]));
    diagnostics.recordDelta();
    diagnostics.recordDelta();
    diagnostics.recordDelta();
    expect(diagnostics.summary()).toEqual({
      deltaCount: 3,
      msToFirstDelta: 40,
      msTotal: 900,
    });
  });
});
