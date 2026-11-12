import { greetingText, headerDateText, timeOfDaySymbol } from './greeting';

const at = (hour: number) => new Date(2026, 10, 8, hour, 30);

describe('greetingText', () => {
  it('follows Latent Spaces’ hours', () => {
    expect(greetingText(at(3))).toBe(
      'Good Early Morning.\nWelcome to Aspen Grove.'
    );
    expect(greetingText(at(9))).toMatch(/^Good Morning\./);
    expect(greetingText(at(13))).toMatch(/^Good Afternoon\./);
    expect(greetingText(at(18))).toMatch(/^Good Evening\./);
    expect(greetingText(at(23))).toMatch(/^Good Evening\./);
  });

  it('greets a name when there is one', () => {
    expect(greetingText(at(18), ' Asher ')).toBe('Good Evening,\nAsher.');
    expect(greetingText(at(18), '  ')).toMatch(/Welcome to Aspen Grove\.$/);
  });

  it('treats the default name as no name, like Latent Spaces’ empty one', () => {
    expect(greetingText(at(18), 'Human')).toBe(
      'Good Evening.\nWelcome to Aspen Grove.'
    );
    expect(greetingText(at(18), null)).toBe(
      'Good Evening.\nWelcome to Aspen Grove.'
    );
    expect(greetingText(at(18), 'Humane')).toBe('Good Evening,\nHumane.');
  });
});

describe('headerDateText', () => {
  it('reads "E, MMMM dd"', () => {
    expect(headerDateText(at(18), 'en-US')).toBe('Sun, November 08');
  });
});

describe('timeOfDaySymbol', () => {
  it('maps the hour to the symbol', () => {
    expect(timeOfDaySymbol(at(4))).toBe('moon-zzz');
    expect(timeOfDaySymbol(at(5))).toBe('sun');
    expect(timeOfDaySymbol(at(12))).toBe('cloud-sun');
    expect(timeOfDaySymbol(at(17))).toBe('moon-stars');
    expect(timeOfDaySymbol(at(22))).toBe('moon-zzz');
  });
});
