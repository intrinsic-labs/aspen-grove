import {
  formatPerMillion,
  formatPriceSummary,
  formatUsd,
  pricingLines,
} from './model-price-format';

describe('formatUsd', () => {
  it.each([
    [0, 'Free'],
    [3, '$3'],
    [15, '$15'],
    [0.15, '$0.15'],
    [0.075, '$0.075'],
    [1.25, '$1.25'],
    [0.0375, '$0.0375'],
    [2.6666667, '$2.67'],
    [150.4, '$150'],
    [0.00001, '<$0.0001'],
  ])('%p → %p', (usd, text) => {
    expect(formatUsd(usd)).toBe(text);
  });
});

describe('formatPerMillion', () => {
  it('adds /M, but not to Free', () => {
    expect(formatPerMillion(3)).toBe('$3/M');
    expect(formatPerMillion(0)).toBe('Free');
  });
});

describe('formatPriceSummary', () => {
  it('gives input and output per million', () => {
    expect(
      formatPriceSummary({
        promptPricePerMTokens: 3,
        completionPricePerMTokens: 15,
      })
    ).toBe('$3/M in · $15/M out');
  });

  it('says Free when both are free, and varies for a router', () => {
    expect(
      formatPriceSummary({
        promptPricePerMTokens: 0,
        completionPricePerMTokens: 0,
      })
    ).toBe('Free');
    expect(formatPriceSummary({ variablePricing: true })).toBe('Price varies');
  });

  it('is null without a price', () => {
    expect(formatPriceSummary({ promptPricePerMTokens: 3 })).toBeNull();
  });
});

describe('pricingLines', () => {
  it('lists input, output, then image and request prices when present', () => {
    expect(
      pricingLines({
        id: 'google/example',
        displayName: 'Google: Example',
        promptPricePerMTokens: 2,
        completionPricePerMTokens: 10,
        imagePricePerMTokens: 2,
        requestPrice: 0.005,
      })
    ).toEqual([
      { label: 'Input', value: '$2 / M tokens' },
      { label: 'Output', value: '$10 / M tokens' },
      { label: 'Image input', value: '$2 / M tokens' },
      { label: 'Per request', value: '$0.005' },
    ]);
  });

  it('gives one line for a router', () => {
    expect(
      pricingLines({
        id: 'openrouter/auto',
        displayName: 'Auto',
        variablePricing: true,
      })
    ).toEqual([{ label: 'Price', value: 'Varies by the routed model' }]);
  });
});
