import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cache = vi.hoisted(() => ({
  missing: vi.fn<(entries: [string, number][]) => Promise<string[]>>(),
  write: vi.fn<(key: string, data: ArrayBuffer) => Promise<void>>(),
  clear: vi.fn<() => Promise<void>>(),
}));

vi.mock("@/features/offline/tileCache", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/offline/tileCache")>();
  return {
    ...actual,
    remoteTileBase: () => "https://tiles.example",
    missingTileCache: cache.missing,
    writeTileCache: cache.write,
    clearTileCache: cache.clear,
  };
});

import { OfflineTilesSection } from "@/features/offline/OfflineTilesSection";
import {
  createTileProtocolHandler,
  tileKeyFromPath,
  tileProtocolUrl,
} from "@/features/offline/tileCache";
import {
  formatBytes,
  parseTileIndex,
  runPool,
} from "@/features/offline/tileIndex";
import { useOfflineTilesStore } from "@/stores/offlineTilesStore";

const png = (n: number) => new Uint8Array(n).fill(7).buffer;

describe("tile index", () => {
  it("parses entries and totals bytes", () => {
    const index = parseTileIndex({
      version: "abc",
      tiles: [
        ["a/static/5/1/2.png", 10],
        ["a/static/5/1/3.png", 5],
      ],
    });
    expect(index).toMatchObject({ version: "abc", count: 2, bytes: 15 });
  });

  it("rejects malformed indexes", () => {
    expect(() => parseTileIndex(null)).toThrow();
    expect(() => parseTileIndex({ tiles: [] })).toThrow(/version/);
    expect(() =>
      parseTileIndex({ version: "v", tiles: [["a.txt", 1]] }),
    ).toThrow(/entry/);
  });

  it("runs a bounded pool and stops on abort", async () => {
    let inFlight = 0;
    let peak = 0;
    const seen: number[] = [];
    await runPool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      seen.push(n);
      inFlight--;
    });
    expect(peak).toBe(3);
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);

    const controller = new AbortController();
    const ran: number[] = [];
    await runPool(
      [1, 2, 3, 4],
      1,
      async (n) => {
        ran.push(n);
        if (n === 2) controller.abort();
      },
      controller.signal,
    );
    expect(ran).toEqual([1, 2]);
  });

  it("formats byte sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(506_533_670)).toBe("483 MB");
  });
});

describe("tile protocol", () => {
  it("maps manifest tile paths to cache keys and protocol URLs", () => {
    const rel = "tiles/terrain-slope/static/{z}/{x}/{y}.png";
    expect(tileKeyFromPath(rel)).toBe("terrain-slope/static/{z}/{x}/{y}.png");
    expect(tileProtocolUrl(rel)).toBe(
      "nisar-tile://terrain-slope/static/{z}/{x}/{y}.png",
    );
  });

  it("serves cached tiles without touching the network", async () => {
    const fetchFn = vi.fn();
    const handler = createTileProtocolHandler({
      read: async () => png(4),
      fetchFn,
      base: "https://tiles.example",
    });
    const { data } = await handler(
      { url: "nisar-tile://a/static/9/1/2.png" },
      new AbortController(),
    );
    expect(data.byteLength).toBe(4);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fetches misses from the remote host and keeps a copy", async () => {
    const write = vi.fn(async () => {});
    const fetchFn = vi.fn(async () => new Response(png(8)));
    const handler = createTileProtocolHandler({
      read: async () => null,
      write,
      fetchFn: fetchFn as unknown as typeof fetch,
      base: "https://tiles.example",
    });
    const { data } = await handler(
      { url: "nisar-tile://a/static/9/1/2.png" },
      new AbortController(),
    );
    expect(fetchFn.mock.calls[0][0]).toBe(
      "https://tiles.example/tiles/a/static/9/1/2.png",
    );
    expect(data.byteLength).toBe(8);
    expect(write).toHaveBeenCalledWith(
      "a/static/9/1/2.png",
      expect.any(ArrayBuffer),
    );
  });

  it("answers skipped (404) tiles with a transparent PNG and fails without a host", async () => {
    const handler = createTileProtocolHandler({
      read: async () => null,
      write: async () => {},
      fetchFn: (async () =>
        new Response(null, { status: 404 })) as unknown as typeof fetch,
      base: "https://tiles.example",
    });
    const { data } = await handler(
      { url: "nisar-tile://a/static/9/1/2.png" },
      new AbortController(),
    );
    expect(new Uint8Array(data).slice(1, 4)).toEqual(
      new Uint8Array([0x50, 0x4e, 0x47]),
    );

    const offline = createTileProtocolHandler({
      read: async () => null,
      base: null,
    });
    await expect(
      offline({ url: "nisar-tile://a/b.png" }, new AbortController()),
    ).rejects.toThrow(/not cached/);
  });
});

describe("offline download", () => {
  const index = {
    version: "v1",
    tiles: [
      ["a/static/5/1/1.png", 3],
      ["a/static/5/1/2.png", 4],
      ["a/static/5/1/3.png", 5],
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    cache.missing.mockReset();
    cache.write.mockReset().mockResolvedValue(undefined);
    cache.clear.mockReset().mockResolvedValue(undefined);
    useOfflineTilesStore.setState({
      phase: "idle",
      saved: null,
      error: null,
      done: 0,
      total: 0,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("downloads only missing tiles and saves a pack marker", async () => {
    cache.missing.mockResolvedValue([
      "a/static/5/1/2.png",
      "a/static/5/1/3.png",
    ]);
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("index.json")
        ? Response.json(index)
        : new Response(png(url.endsWith("2.png") ? 4 : 5)),
    );
    vi.stubGlobal("fetch", fetchMock);

    await useOfflineTilesStore.getState().start();

    const state = useOfflineTilesStore.getState();
    expect(state.phase).toBe("done");
    expect(state.done).toBe(3);
    expect(state.saved).toMatchObject({ version: "v1", count: 3, bytes: 12 });
    expect(cache.write.mock.calls.map(([key]) => key).sort()).toEqual([
      "a/static/5/1/2.png",
      "a/static/5/1/3.png",
    ]);
    expect(
      JSON.parse(localStorage.getItem("nisar.offlineTiles.v1") ?? "{}"),
    ).toMatchObject({
      version: "v1",
    });
  });

  it("reports failed tiles without saving a marker", async () => {
    cache.missing.mockResolvedValue(["a/static/5/1/1.png"]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("index.json")
          ? Response.json(index)
          : new Response(null, { status: 403 }),
      ),
    );

    await useOfflineTilesStore.getState().start();

    const state = useOfflineTilesStore.getState();
    expect(state.phase).toBe("error");
    expect(state.error).toMatch(/1 tile/);
    expect(state.saved).toBeNull();
  });

  it("removes the cache and the marker", async () => {
    useOfflineTilesStore.setState({
      saved: { version: "v1", count: 3, bytes: 12, completedAt: "now" },
    });
    await useOfflineTilesStore.getState().remove();
    expect(cache.clear).toHaveBeenCalled();
    expect(useOfflineTilesStore.getState().saved).toBeNull();
  });
});

describe("OfflineTilesSection", () => {
  it("renders nothing on desktop without a remote tile host", () => {
    const { container } = render(
      <OfflineTilesSection available={false} desktop />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("links to the desktop app in the browser build", () => {
    render(<OfflineTilesSection available={false} desktop={false} />);
    expect(
      screen.getByRole("link", { name: /Get the desktop app/ }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("/getting-started/download/"),
    );
  });

  it("offers the download in the desktop app", () => {
    useOfflineTilesStore.setState({ phase: "idle", saved: null });
    render(<OfflineTilesSection available />);
    expect(
      screen.getByRole("button", { name: "Download for offline" }),
    ).toBeInTheDocument();
  });
});
