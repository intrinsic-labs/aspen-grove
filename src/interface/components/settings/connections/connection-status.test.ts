import { connectionStatus, type ConnectionSnapshot } from './connection-status';

const snapshot = (overrides: Partial<ConnectionSnapshot> = {}) => ({
  hasKey: { openrouter: false, anthropic: false, openai: false },
  lmstudioEndpoint: 'http://localhost:1234',
  ...overrides,
});

describe('connectionStatus', () => {
  it.each(['openrouter', 'anthropic', 'openai'] as const)(
    'says whether %s has a key',
    (provider) => {
      expect(connectionStatus(provider, snapshot())).toBe('No key');
      expect(
        connectionStatus(
          provider,
          snapshot({
            hasKey: {
              openrouter: false,
              anthropic: false,
              openai: false,
              [provider]: true,
            },
          })
        )
      ).toBe('Key stored');
    }
  );

  it('reads one provider’s key without the others', () => {
    const keys = { openrouter: false, anthropic: true, openai: false };
    expect(connectionStatus('anthropic', snapshot({ hasKey: keys }))).toBe(
      'Key stored'
    );
    expect(connectionStatus('openai', snapshot({ hasKey: keys }))).toBe(
      'No key'
    );
  });

  it('shows LM Studio as its saved server address', () => {
    expect(connectionStatus('lmstudio', snapshot())).toBe('localhost:1234');
    expect(
      connectionStatus(
        'lmstudio',
        snapshot({ lmstudioEndpoint: ' http://192.168.1.20:1235/v1/ ' })
      )
    ).toBe('192.168.1.20:1235');
  });

  it('says LM Studio is not set up once its address is cleared', () => {
    expect(
      connectionStatus('lmstudio', snapshot({ lmstudioEndpoint: '' }))
    ).toBe('Not set up');
    expect(
      connectionStatus('lmstudio', snapshot({ lmstudioEndpoint: '  ' }))
    ).toBe('Not set up');
  });
});
