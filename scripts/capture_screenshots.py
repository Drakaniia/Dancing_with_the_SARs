"""Capture README and docs screenshots from a running Vite server.

Requires Python Playwright and Microsoft Edge. Run `pnpm dev` first, then:
    python scripts/capture_screenshots.py
"""

import argparse
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "screenshots"
PAD = 12


def settle(page, ms=600):
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(ms)


def wait_for_tiles(page):
    """Give the basemap and overlay tiles time to load before capturing the map."""
    try:
        page.wait_for_load_state("networkidle", timeout=20000)
    except Exception:
        print("Network did not go idle; capturing anyway", flush=True)
    settle(page, 1500)


def capture(page, name):
    page.mouse.move(800, 70)
    settle(page, 0)
    page.screenshot(path=str(OUTPUT / name), animations="disabled", timeout=20000)
    print(f"Saved docs/screenshots/{name}", flush=True)


def crop(page, name, *locators, pad=PAD):
    """Save the viewport area covering every locator, plus padding."""
    locators[0].scroll_into_view_if_needed()
    settle(page, 300)
    boxes = [loc.bounding_box() for loc in locators]
    view = page.viewport_size
    x0 = max(min(b["x"] for b in boxes) - pad, 0)
    y0 = max(min(b["y"] for b in boxes) - pad, 0)
    x1 = min(max(b["x"] + b["width"] for b in boxes) + pad, view["width"])
    y1 = min(max(b["y"] + b["height"] for b in boxes) + pad, view["height"])
    clip = {"x": x0, "y": y0, "width": x1 - x0, "height": y1 - y0}
    page.screenshot(
        path=str(OUTPUT / name), clip=clip, animations="disabled", timeout=20000
    )
    print(f"Saved docs/screenshots/{name}", flush=True)


def crop_panel(page, name, title):
    """Crop a rail panel tightly so neighbouring panels stay out of frame."""
    crop(page, name, panel(page, title), pad=4)


def panel(page, title):
    return page.get_by_role("region", name=title, exact=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:5173")
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            channel="msedge",
            headless=True,
            args=["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
        )
        context = browser.new_context(
            viewport={"width": 1600, "height": 1000},
            device_scale_factor=1,
            reduced_motion="reduce",
            color_scheme="light",
        )
        page = context.new_page()
        page.goto(args.url, wait_until="domcontentloaded", timeout=30000)
        page.get_by_role("status").filter(has_text="57 layers").wait_for()
        page.locator(".maplibregl-canvas").wait_for()
        canvas = page.locator(".maplibregl-canvas")
        wait_for_tiles(page)

        # Fold long catalogues using the same controls available to users.
        for label in ["Radar Backscatter & Change", "8 June 2026 Earthquake"]:
            button = page.get_by_role("button", name=label)
            if button.get_attribute("aria-expanded") == "true":
                button.click()
        capture(page, "dashboard-light.png")

        page.get_by_role("button", name="Switch to Night Atlas dark mode", exact=True).click()
        capture(page, "dashboard-dark.png")

        page.get_by_role("button", name="Switch to Sand Atlas light mode", exact=True).click()
        canvas.click(position={"x": 430, "y": 380})
        capture(page, "location-inspection.png")

        page.get_by_role("button", name="Data provenance", exact=True).click()
        page.get_by_role("dialog").wait_for()
        capture(page, "data-provenance.png")
        page.keyboard.press("Escape")
        page.get_by_role("dialog").wait_for(state="hidden")

        # Datasets and layers.
        crop_panel(page, "layers-change-types.png", "Surface Change Types")
        crop_panel(page, "layers-map-layers.png", "Map Layers")
        crop_panel(page, "layers-legend.png", "Legend")

        # Timeline and playback.
        crop_panel(page, "timeline-panel.png", "Time Series")
        bar_slider = page.get_by_role("slider", name="Time series position")
        bar = page.locator(".glass").filter(has=bar_slider)
        bar.hover()
        crop(page, "timeline-animation-bar.png", bar)

        # Search, bookmarks and tools.
        search = page.get_by_role("searchbox", name="Search locations")
        search.click()
        search.fill("Sarangani")
        results = page.get_by_role("listbox", name="Search results")
        results.wait_for()
        crop(page, "search-results.png", search, results)
        search.fill("Malalan")
        search.press("Enter")
        settle(page, 3000)

        page.get_by_role("button", name="Bookmark", exact=True).click()
        page.get_by_role("button", name="Measure", exact=True).click()
        canvas.click(position={"x": 380, "y": 420})
        canvas.click(position={"x": 620, "y": 300})
        page.get_by_text("Distance:").wait_for()
        crop_panel(page, "tools-panel.png", "Tools")
        page.mouse.move(800, 70)
        crop(page, "measure-distance.png", page.get_by_text("Distance:").locator(".."), pad=16)

        bookmarks = page.get_by_role("button", name="Bookmarks", exact=True)
        bookmarks.click()
        menu = page.get_by_role("dialog", name="Bookmarks")
        menu.wait_for()
        crop(page, "bookmarks-menu.png", bookmarks, menu)
        page.keyboard.press("Escape")
        menu.wait_for(state="hidden")

        page.get_by_role("button", name="Clear measurement").click()
        page.get_by_role("button", name="Measure", exact=True).click()

        # Comparison view, from a fresh load so the map is at the default overview.
        page.reload(wait_until="domcontentloaded")
        page.get_by_role("status").filter(has_text="57 layers").wait_for()
        canvas.wait_for()
        wait_for_tiles(page)
        page.get_by_role("switch", name="Comparison View").click()
        page.get_by_label("Split curtain position").wait_for()
        crop_panel(page, "comparison-panel.png", "Comparison View")
        capture(page, "comparison-view.png")
        browser.close()


if __name__ == "__main__":
    main()
