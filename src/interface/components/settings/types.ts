import type { NodeViewStyle, SelectableProvider } from '@domain/entities';

export type ChatFontFace =
  | 'Cardo-Regular'
  | 'IBMPlexMono-Regular'
  | 'OpenSans-Regular';

export type SettingsDraft = {
  // Provider selection
  readonly selectedProvider: SelectableProvider;

  // OpenRouter settings
  readonly apiKeyInput: string;
  readonly modelIdentifierInput: string;

  // LM Studio settings
  readonly lmstudioEndpointInput: string;
  readonly lmstudioApiTokenInput: string;
  readonly lmstudioUseMcpTools: boolean;
  readonly lmstudioAutoLoadModels: boolean;
  readonly lmstudioSelectedModel: string;

  // Generation defaults
  readonly systemPromptInput: string;
  readonly temperatureInput: string;
  readonly maxTokensInput: string;

  // App behavior
  readonly verboseErrorAlerts: boolean;

  // Typography
  readonly fontFace: ChatFontFace;
  readonly fontSizeInput: string;
  readonly nodeViewStyle: NodeViewStyle;
  readonly nodeViewCornerRadiusInput: string;
};
