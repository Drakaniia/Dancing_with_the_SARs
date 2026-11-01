export async function getCachedTile(_path: string): Promise<string | null> {
  return null;
}

export async function cacheTile(_path: string, _data: Blob): Promise<void> {}

export function evictOldTiles(): void {}
