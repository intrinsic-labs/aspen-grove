import { describe, expect, it } from '@jest/globals';
import { HOME_LINKS } from '../../home/home-links';
import { APP_INFO_LINKS } from './app-info-links';
import { appVersionLabel } from './app-version-label';

describe('APP_INFO_LINKS', () => {
  it('lists the approved rows in order', () => {
    expect(APP_INFO_LINKS.map((l) => [l.title, l.url])).toEqual([
      ['Created by Intrinsic Labs', 'https://intrinsiclabs.co'],
      ['Open Loom Specification', HOME_LINKS.openLoomDocs],
      [
        'Aspen Grove on GitHub',
        'https://github.com/intrinsic-labs/aspen-grove',
      ],
      ['Inspired by socketteer/clooi', 'https://github.com/socketteer/clooi'],
    ]);
  });

  it('has unique slugs and SF symbols, and no Discord link', () => {
    expect(APP_INFO_LINKS.map((l) => l.slug)).toEqual([
      'intrinsic-labs',
      'open-loom',
      'github',
      'clooi',
    ]);
    expect(APP_INFO_LINKS.map((l) => l.systemIcon)).toEqual([
      'heart',
      'book',
      'chevron.left.forwardslash.chevron.right',
      'lightbulb',
    ]);
    expect(APP_INFO_LINKS.some((l) => /discord/i.test(l.url))).toBe(false);
  });
});

describe('appVersionLabel', () => {
  it('shows version and build', () => {
    expect(appVersionLabel('1.0.0', '12')).toBe('Aspen Grove v1.0.0 (12)');
  });

  it('drops the build when there is none', () => {
    expect(appVersionLabel('1.0.0', null)).toBe('Aspen Grove v1.0.0');
    expect(appVersionLabel(null, null)).toBe('Aspen Grove v');
  });
});
