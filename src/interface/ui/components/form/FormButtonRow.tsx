import { FormLabel, type FormIconName } from './FormLabel';
import { FormRow } from './FormRow';

type FormButtonRowProps = {
  readonly title: string;
  readonly icon?: FormIconName;
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
      tone={destructive ? 'destructive' : 'accent'}
    />
  </FormRow>
);
