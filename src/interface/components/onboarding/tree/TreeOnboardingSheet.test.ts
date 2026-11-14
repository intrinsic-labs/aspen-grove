import { describe, expect, it, jest } from '@jest/globals';
import { createElement } from 'react';
import { Modal } from 'react-native';
import { act } from '@interface/test-support/render-hook';
import { TreeOnboardingSheet } from './TreeOnboardingSheet';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../intro/OnboardingItemRow', () => ({
  OnboardingItemRow: () => null,
}));

type ModalProps = {
  readonly allowSwipeDismissal?: boolean;
  readonly onRequestClose?: () => void;
};

const TestRenderer: {
  create: (element: unknown) => {
    root: {
      findByType: (type: unknown) => { props: ModalProps };
      findByProps: (props: object) => { props: { onPress: () => void } };
    };
  };
} = require('react-test-renderer');

const renderSheet = async () => {
  const onClose = jest.fn();
  let renderer: ReturnType<typeof TestRenderer.create> | undefined;
  await act(() => {
    renderer = TestRenderer.create(
      createElement(TreeOnboardingSheet, { visible: true, onClose })
    );
  });
  if (!renderer) {
    throw new Error('The sheet did not render.');
  }
  return { root: renderer.root, onClose };
};

describe('TreeOnboardingSheet', () => {
  it('can be swiped down, which closes it as Begin does', async () => {
    const { root, onClose } = await renderSheet();
    const modal = root.findByType(Modal).props;

    expect(modal.allowSwipeDismissal).toBe(true);
    modal.onRequestClose?.();
    expect(onClose).toHaveBeenCalledTimes(1);

    root.findByProps({ testID: 'tree-onboarding-begin' }).props.onPress();
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
