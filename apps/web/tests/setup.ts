import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest runs without globals, so Testing Library's auto-cleanup never registers.
afterEach(() => {
  cleanup();
});

/**
 * jsdom gaps the primitive tests rely on. Each shim is a no-op stand-in for a browser API that
 * jsdom either does not implement or implements without layout, so tests can drive pointer
 * gestures and measure elements.
 */

if (typeof globalThis.ResizeObserver !== "function") {
  class ResizeObserverStub implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}

if (typeof globalThis.PointerEvent !== "function") {
  // jsdom has no PointerEvent constructor; `fireEvent.pointerDown/Move/Up` need one.
  class PointerEventStub extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.pointerType = params.pointerType ?? "mouse";
      this.isPrimary = params.isPrimary ?? true;
    }
  }
  globalThis.PointerEvent = PointerEventStub as unknown as typeof PointerEvent;
}

if (typeof Element.prototype.setPointerCapture !== "function") {
  const captured = new WeakSet<Element>();
  Element.prototype.setPointerCapture = function setPointerCapture(
    this: Element,
  ) {
    captured.add(this);
  };
  Element.prototype.releasePointerCapture = function releasePointerCapture(
    this: Element,
  ) {
    captured.delete(this);
  };
  Element.prototype.hasPointerCapture = function hasPointerCapture(
    this: Element,
  ) {
    return captured.has(this);
  };
}

// jsdom defines `scrollTo` but throws "not implemented"; Motion calls it during focus handling.
window.scrollTo = () => {};

if (typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
