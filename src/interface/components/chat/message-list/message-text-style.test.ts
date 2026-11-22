import { fonts } from '@interface/ui/value-objects/fonts';
import { toMessageTextStyle } from './message-text-style';
import { composerFieldMetrics } from '../composer/composer-field-metrics';
import { createMarkdownStyles } from '../markdown/markdown-styles';

it.each([undefined, fonts.system, fonts.mono])(
  'resolves %s consistently for messages, markdown and the composer',
  (family) => {
    const preferences = {
      messageFontFamily: family,
      messageFontSize: 17,
      messageLineHeight: 23,
      userNodeViewStyle: 'filled' as const,
      userNodeCornerRadius: 8,
    };
    const expected = family ?? fonts.cardoRegular;
    const message = toMessageTextStyle(preferences);
    expect(message.fontFamily).toBe(expected);
    expect(composerFieldMetrics(preferences).textStyle.fontFamily).toBe(
      expected
    );
    const markdown = createMarkdownStyles(message, {
      textColor: 'white',
      secondary: 'grey',
      codeBackground: 'black',
      green: 'green',
    });
    expect(markdown.body.fontFamily).toBe(expected);
  }
);
