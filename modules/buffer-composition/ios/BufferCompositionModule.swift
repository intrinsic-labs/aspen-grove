import ExpoModulesCore
import UIKit

/// Tells JS whether the buffer editor's text view holds marked text (an IME
/// composition in progress: Japanese kana, Chinese pinyin, Korean jamo), which
/// React Native does not expose, and can end that composition on request.
///
/// The editor is found by its testID, which React Native sets as the
/// accessibility identifier of the component view above the UITextView.
public class BufferCompositionModule: Module {
  private static let editorIdentifier = "buffer-document"
  private weak var textView: UITextView?
  private var composing = false
  private var poll: Timer?
  private var observers: [NSObjectProtocol] = []

  public func definition() -> ModuleDefinition {
    Name("BufferComposition")

    Events("onCompositionChange")

    OnStartObserving {
      DispatchQueue.main.async { self.startObserving() }
    }

    OnStopObserving {
      DispatchQueue.main.async { self.stopObserving() }
    }

    /// Commits the marked text and ends the composition; the keyboard stays up.
    AsyncFunction("endComposition") { () -> Bool in
      guard let view = self.textView, view.markedTextRange != nil else {
        return false
      }
      view.unmarkText()
      self.refresh(view)
      return true
    }.runOnQueue(.main)
  }

  private func startObserving() {
    let center = NotificationCenter.default
    let names: [Notification.Name] = [
      UITextView.textDidBeginEditingNotification,
      UITextView.textDidChangeNotification,
      UITextView.textDidEndEditingNotification,
    ]
    observers = names.map { name in
      center.addObserver(forName: name, object: nil, queue: .main) { [weak self] note in
        guard let view = note.object as? UITextView, self?.isEditor(view) == true else { return }
        self?.refresh(view)
      }
    }
  }

  private func stopObserving() {
    observers.forEach { NotificationCenter.default.removeObserver($0) }
    observers = []
    poll?.invalidate()
    poll = nil
    composing = false
    textView = nil
  }

  private func isEditor(_ view: UIView) -> Bool {
    var current: UIView? = view
    while let node = current {
      if node.accessibilityIdentifier == Self.editorIdentifier { return true }
      current = node.superview
    }
    return false
  }

  /// Reports a change of `markedTextRange != nil`. UIKit posts no notification
  /// when a composition is confirmed unchanged (kana accepted as typed), so
  /// while one is open a short poll watches for it to close.
  private func refresh(_ view: UITextView) {
    textView = view
    let marked = view.markedTextRange != nil
    if marked {
      startPolling()
    } else {
      poll?.invalidate()
      poll = nil
    }
    guard marked != composing else { return }
    composing = marked
    sendEvent("onCompositionChange", ["composing": marked])
  }

  private func startPolling() {
    guard poll == nil else { return }
    poll = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
      guard let self, let view = self.textView else { return }
      self.refresh(view)
    }
  }
}
