/**
 * Whether the map is still loading the frame the timeline last asked for. The tile overlay sets
 * it; the playback loop waits for it so each date is actually drawn before moving on.
 */
let pending = false;
let since = 0;

export function setFramePending(next: boolean): void {
  if (next && !pending) since = Date.now();
  pending = next;
}

export function isFramePending(): boolean {
  return pending;
}

/** How long the current frame has been loading, in milliseconds (0 when it is ready). */
export function framePendingFor(): number {
  return pending ? Date.now() - since : 0;
}
