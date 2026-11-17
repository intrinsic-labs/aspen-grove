import { getHomeDraft, setHomeDraft } from '../../home/home-draft-store';
import { setDialogueDraft } from '../dialogue-draft-store';
import {
  returnDraftToHome,
  returnTreeDraftToHome,
} from './return-draft-to-home';

describe('returnDraftToHome', () => {
  afterEach(() => setHomeDraft(''));

  it("puts a discarded tree's draft back in Home's empty composer", () => {
    expect(returnDraftToHome('Hello, loom.')).toBe(true);
    expect(getHomeDraft()).toBe('Hello, loom.');
  });

  it('leaves text already on Home alone', () => {
    setHomeDraft('Typed since');
    expect(returnDraftToHome('Hello, loom.')).toBe(false);
    expect(getHomeDraft()).toBe('Typed since');
  });

  it('treats whitespace on Home as empty', () => {
    setHomeDraft('  ');
    expect(returnDraftToHome('Hello, loom.')).toBe(true);
    expect(getHomeDraft()).toBe('Hello, loom.');
  });

  it('has nothing to return for an empty draft', () => {
    expect(returnDraftToHome(' \n')).toBe(false);
    expect(getHomeDraft()).toBe('');
  });

  it("reads the tree's composer draft", () => {
    setDialogueDraft('tree-a', 'Carried over');
    returnTreeDraftToHome('tree-a' as never);
    expect(getHomeDraft()).toBe('Carried over');
  });
});
