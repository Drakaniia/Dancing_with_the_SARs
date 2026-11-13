"""Capture README screenshots from a running Vite server.

Requires Python Playwright and Microsoft Edge. Run `pnpm dev` first, then:
    python scripts/capture_screenshots.py
"""

import argparse
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "screenshots"


def capture(page, name):
    page.mouse.move(800, 70)
    page.evaluate("document.fonts.ready")
    page.screenshot(path=str(OUTPUT / name), animations="disabled", timeout=20000)
    print(f"Saved docs/screenshots/{name}", flush=True)


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

        # Fold long catalogues using the same controls available to users.
        for label in ["Radar Backscatter & Change", "8 June 2026 Earthquake"]:
            button = page.get_by_role("button", name=label)
            if button.get_attribute("aria-expanded") == "true":
                button.click()
        capture(page, "dashboard-light.png")

        page.get_by_role("button", name="Switch to Night Atlas dark mode", exact=True).click()
        capture(page, "dashboard-dark.png")

        page.get_by_role("button", name="Switch to Sand Atlas light mode", exact=True).click()
        page.locator(".maplibregl-canvas").click(position={"x": 430, "y": 380})
        capture(page, "location-inspection.png")

        page.get_by_role("button", name="Data provenance", exact=True).click()
        page.get_by_role("dialog").wait_for()
        capture(page, "data-provenance.png")
        browser.close()


if __name__ == "__main__":
    main()
