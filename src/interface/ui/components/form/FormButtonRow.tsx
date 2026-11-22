import type { ComponentProps } from 'react';
import { FormLabel, type FormIconName } from './FormLabel';
import { FormRow } from './FormRow';

type FormButtonRowProps = {
  readonly title: string;
  readonly icon?: FormIconName;
  /** SF Symbol on iOS; `icon` is its fallback elsewhere. */
  readonly systemIcon?: ComponentProps<typeof FormLabel>['systemIcon'];
  readonly onPress: () => void;
  readonly disabled?: boolean;
  /** Destructive buttons are red, as in a Form. */
  readonly destructive?: boolean;
  readonly testID?: string;
};

/** A Form `Button` or `Link`: the label in the accent tint. */
export const FormButtonRow = ({
  title,
  icon,
  systemIcon,
  onPress,
  disabled,
  destructive = false,
  testID,
}: FormButtonRowProps) => (
  <FormRow
    testID={testID}
    onPress={onPress}
    disabled={disabled}
    accessibilityLabel={title}
  >
    <FormLabel
      title={title}
      icon={icon}
      systemIcon={systemIcon}
      tone={destructive ? 'destructive' : 'accent'}
    />
  </FormRow>
);
