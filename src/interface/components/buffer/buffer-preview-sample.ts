import type { AuthorshipRun } from '@application/services/buffer/authorship-runs';
import {
  type PreviewDocument,
  previewDocument,
} from './buffer-preview-document';

const human = (text: string): AuthorshipRun => ({ author: 'human', text });
const model = (text: string): AuthorshipRun => ({ author: 'model', text });

/**
 * A human opening, two model endings that differ, and, in the first, a
 * human word typed inside a model sentence. Each ending descends from its
 * own model text, which undo reconciles a restored string against: the
 * first ending's human "old" took the place of the model's "quaint".
 */
export const samplePreview = (): PreviewDocument => {
  const first = [
    model(
      'By evening the whole town lay quiet under it, and the lamps along the '
    ),
    human('old'),
    model(' harbour came on one by one, soft and yellow.'),
  ];
  const second = [
    model(
      'Nobody went out. The kettles sang in every kitchen, and the children ' +
        'pressed their faces to the glass, waiting for the world to begin again.'
    ),
  ];
  return previewDocument({
    prefix: [human('The snow had been falling since dawn. ')],
    endings: [first, second],
    ancestors: [
      [
        model(
          'By evening the whole town lay quiet under it, and the lamps along the ' +
            'quaint harbour came on one by one, soft and yellow.'
        ),
      ],
      second,
    ],
  });
};
