import { beforeEach, describe, expect, it } from "vitest";
import { readSetting, writeSetting } from "@/shared/utils/settings";

describe("settings (browser build)", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips values through localStorage", async () => {
    await writeSetting("ui.bookmarks", [{ id: "a" }]);
    expect(localStorage.getItem("nisar.settings.ui.bookmarks")).toBe(
      '[{"id":"a"}]',
    );
    expect(await readSetting("ui.bookmarks")).toEqual([{ id: "a" }]);
  });

  it("returns undefined for missing or corrupt entries", async () => {
    expect(await readSetting("ui.panels")).toBeUndefined();
    localStorage.setItem("nisar.settings.ui.panels", "{not json");
    expect(await readSetting("ui.panels")).toBeUndefined();
  });
});
