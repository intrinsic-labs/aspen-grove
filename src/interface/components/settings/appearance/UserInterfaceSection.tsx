import type { NodeViewStyle } from '@domain/entities';
import {
  FormPickerRow,
  FormSection,
  FormToggleRow,
} from '@/interface/ui/components/form';
import type { ChatFontFace } from '../types';
import {
  FONT_OPTIONS,
  MESSAGE_STYLE_OPTIONS,
  cornerRadiusOptions,
  fontSizeOptions,
} from './interface-options';

type UserInterfaceSectionProps = {
  readonly fontFace: ChatFontFace;
  readonly onChangeFontFace: (value: ChatFontFace) => void;
  readonly fontSize: number;
  readonly onChangeFontSize: (value: number) => void;
  readonly nodeViewStyle: NodeViewStyle;
  readonly onChangeNodeViewStyle: (value: NodeViewStyle) => void;
  readonly cornerRadius: number;
  readonly onChangeCornerRadius: (value: number) => void;
  readonly verboseErrorAlerts: boolean;
  readonly onChangeVerboseErrorAlerts: (value: boolean) => void;
  readonly autoTitleEnabled: boolean;
  readonly onChangeAutoTitleEnabled: (value: boolean) => void;
};

/**
 * Latent Spaces' user interface section (LoomSettingsView.swift:228-281):
 * menu pickers for font, size, message style and corner radius, then the
 * Verbose Error Alerts toggle. Aspen Grove's Auto-Title toggle follows it.
 */
export const UserInterfaceSection = (props: UserInterfaceSectionProps) => (
  <FormSection
    testID="settings-typography-section"
    header="User Interface Settings"
  >
    <FormPickerRow
      testID="settings-typography-font"
      title="Font"
      value={props.fontFace}
      options={FONT_OPTIONS}
      onChange={props.onChangeFontFace}
    />
    <FormPickerRow
      testID="settings-typography-font-size"
      title="Font Size"
      value={props.fontSize}
      options={fontSizeOptions(props.fontSize)}
      onChange={props.onChangeFontSize}
    />
    <FormPickerRow
      testID="settings-typography-message-style"
      title="Message Style"
      value={props.nodeViewStyle}
      options={MESSAGE_STYLE_OPTIONS}
      onChange={props.onChangeNodeViewStyle}
    />
    <FormPickerRow
      testID="settings-typography-corner-radius"
      title="Message Corner Radius"
      value={props.cornerRadius}
      options={cornerRadiusOptions(props.cornerRadius)}
      onChange={props.onChangeCornerRadius}
    />
    <FormToggleRow
      testID="settings-behavior-verbose-errors"
      title="Verbose Error Alerts"
      value={props.verboseErrorAlerts}
      onValueChange={props.onChangeVerboseErrorAlerts}
    />
    <FormToggleRow
      testID="settings-behavior-auto-title"
      title="Auto-Title Conversations"
      value={props.autoTitleEnabled}
      onValueChange={props.onChangeAutoTitleEnabled}
    />
  </FormSection>
);
