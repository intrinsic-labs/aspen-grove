/**
 * Colours live in the token files (`src/interface/ui/value-objects/`), so
 * this ESLint block fails on a colour literal anywhere else in the
 * interface layer: a hex string, an rgb()/rgba()/hsl()/hsla() string, or a
 * CSS named colour. `'transparent'` is allowed. Tests are exempt (their
 * fixtures aren't drawn). Syntax-highlighting themes imported from
 * libraries are not literals in our code, so they pass.
 */

// The CSS named colours React Native accepts (normalize-color), minus
// 'transparent'.
// prettier-ignore
const NAMED_COLOURS = [
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige',
  'bisque', 'black', 'blanchedalmond', 'blue', 'blueviolet', 'brown',
  'burlywood', 'burntsienna', 'cadetblue', 'chartreuse', 'chocolate', 'coral',
  'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan',
  'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki',
  'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred',
  'darksalmon', 'darkseagreen', 'darkslateblue', 'darkslategray',
  'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue',
  'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite',
  'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod',
  'gray', 'green', 'greenyellow', 'grey', 'honeydew', 'hotpink', 'indianred',
  'indigo', 'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen',
  'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink',
  'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray',
  'lightslategrey', 'lightsteelblue', 'lightyellow', 'lime', 'limegreen',
  'linen', 'magenta', 'maroon', 'mediumaquamarine', 'mediumblue',
  'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue',
  'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue',
  'mintcream', 'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace',
  'olive', 'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod',
  'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff',
  'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple', 'red',
  'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen',
  'seashell', 'sienna', 'silver', 'skyblue', 'slateblue', 'slategray',
  'slategrey', 'snow', 'springgreen', 'steelblue', 'tan', 'teal', 'thistle',
  'tomato', 'turquoise', 'violet', 'wheat', 'white', 'whitesmoke', 'yellow',
  'yellowgreen',
];

const message =
  'Colour literal outside the token files. Add a named token to src/interface/ui/value-objects/ (loom-ui-tokens and its tokens/ siblings) and use it.';

// esquery treats a comma as a selector separator, even inside a regex, so
// the hex lengths (3, 4, 6, 8) are spelt out rather than written {3,4}.
const H = '[0-9a-f]';
const hex = `^\\s*#(${H}{3}|${H}{4}|${H}{6}|${H}{8})\\s*$`;
const functional = '^\\s*(rgb|rgba|hsl|hsla)\\(';
const named = `^\\s*(${NAMED_COLOURS.join('|')})\\s*$`;

export const colourLiteralsConfig = {
  files: ['src/interface/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
  ignores: ['src/interface/ui/value-objects/**', '**/*.test.{ts,tsx}'],
  rules: {
    'no-restricted-syntax': [
      'error',
      { selector: `Literal[value=/${hex}/i]`, message },
      { selector: `Literal[value=/${functional}/i]`, message },
      { selector: `TemplateElement[value.raw=/${functional}/i]`, message },
      { selector: `Literal[value=/${named}/i]`, message },
    ],
  },
};
