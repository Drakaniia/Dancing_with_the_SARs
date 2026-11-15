import { describe, expect, it } from "vitest";
import { syncTopicImage, topicImageUrl } from "@/features/topics/TopicOverlays";
import { findTopic, findView, type ViewOption } from "@/features/topics/topicsConfig";

type FakeMap = Parameters<typeof syncTopicImage>[0];

function fakeMap() {
  const layers = new Map<string, { source: string }>();
  const sources = new Map<string, { url: string; updates: string[] }>();
  const before: (string | undefined)[] = [];
  const map = {
    getLayer: (id: string) => layers.get(id),
    getSource: (id: string) => {
      const source = sources.get(id);
      return source
        ? {
            updateImage: ({ url }: { url: string }) => {
              source.url = url;
              source.updates.push(url);
            },
          }
        : undefined;
    },
    addSource: (id: string, spec: { url: string }) => {
      sources.set(id, { url: spec.url, updates: [] });
    },
    addLayer: (layer: { id: string; source: string }, beforeId?: string) => {
      layers.set(layer.id, layer);
      before.push(beforeId);
    },
    removeLayer: (id: string) => {
      layers.delete(id);
    },
    removeSource: (id: string) => {
      sources.delete(id);
    },
  } as unknown as FakeMap;
  return { map, layers, sources, before };
}

const option = (topic: "quake" | "next", view: string, index = 0): ViewOption =>
  findView(findTopic(topic), view).options[index];

const images = (opt: ViewOption) => {
  if (opt.kind !== "images") throw new Error("expected a picture map");
  return opt;
};

describe("Explore picture maps", () => {
  it("picks the outlook month nearest the given date", () => {
    const plants = images(option("next", "plants"));
    expect(topicImageUrl(plants, "2027-04")).toMatch(/outlook-evi-anomaly_2027-04\.webp$/);
    expect(topicImageUrl(plants, "2026-09")).toMatch(/outlook-evi-anomaly_2026-11\.webp$/);
  });

  it("uses the only frame of a one-picture map whatever the date", () => {
    const slope = images(option("quake", "steep"));
    expect(topicImageUrl(slope, "2026-09")).toMatch(/terrain_slope\.webp$/);
    expect(topicImageUrl(slope, null)).toMatch(/terrain_slope\.webp$/);
  });

  it("adds the picture once, swaps the frame by date and removes it for tile views", () => {
    const { map, layers, sources, before } = fakeMap();
    const plants = option("next", "plants");

    syncTopicImage(map, plants, "2026-12", "aoi-boundary-casing");
    expect([...layers.keys()]).toEqual(["topic-image"]);
    expect(before).toEqual(["aoi-boundary-casing"]);
    expect(sources.get("topic-image-source")?.url).toMatch(/_2026-12\.webp$/);

    syncTopicImage(map, plants, "2027-01", "aoi-boundary-casing");
    expect(layers.size).toBe(1);
    expect(sources.get("topic-image-source")?.updates.at(-1)).toMatch(/_2027-01\.webp$/);

    syncTopicImage(map, option("quake", "landslides"), "2027-01", undefined);
    expect(layers.size).toBe(0);
    expect(sources.size).toBe(0);
  });
});
