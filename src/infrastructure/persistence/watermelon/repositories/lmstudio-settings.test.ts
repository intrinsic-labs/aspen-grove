import { DEFAULT_LMSTUDIO_SETTINGS } from '@domain/entities';
import {
  mergeLMStudioSettings,
  parseLMStudioSettings,
} from './lmstudio-settings';

describe('parseLMStudioSettings', () => {
  it('ignores the legacy useMcpTools key stored by older installs', () => {
    const stored = JSON.stringify({
      endpoint: 'http://192.168.1.10:1234',
      useMcpTools: true,
      autoLoadModels: false,
      idleTtlSeconds: 300,
    });

    const settings = parseLMStudioSettings(stored);

    expect(settings).toEqual({
      endpoint: 'http://192.168.1.10:1234',
      autoLoadModels: false,
      idleTtlSeconds: 300,
    });
    expect(settings).not.toHaveProperty('useMcpTools');
  });

  it('drops the legacy key when the merged settings are saved again', () => {
    const existing = parseLMStudioSettings(
      JSON.stringify({ endpoint: 'http://a:1', useMcpTools: false })
    );

    const saved = JSON.parse(
      JSON.stringify(mergeLMStudioSettings(existing, { autoLoadModels: false }))
    );

    expect(saved).toEqual({
      endpoint: 'http://a:1',
      autoLoadModels: false,
      idleTtlSeconds: DEFAULT_LMSTUDIO_SETTINGS.idleTtlSeconds,
    });
  });

  it('falls back to defaults for missing or unreadable JSON', () => {
    expect(parseLMStudioSettings(null)).toEqual(DEFAULT_LMSTUDIO_SETTINGS);
    expect(parseLMStudioSettings('{not json')).toEqual(
      DEFAULT_LMSTUDIO_SETTINGS
    );
    expect(parseLMStudioSettings('null')).toEqual(DEFAULT_LMSTUDIO_SETTINGS);
  });
});
