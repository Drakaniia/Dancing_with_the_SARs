import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { AboutModal } from "@/features/about/AboutModal";
import { COPERNICUS_CREDIT } from "@/features/about/credits";
import { MapAttribution } from "@/features/map/MapAttribution";
import { ProvenanceModal } from "@/features/provenance/ProvenanceModal";
import { useUiStore } from "@/stores/uiStore";

beforeEach(() => {
  useUiStore.setState({ aboutOpen: false, provenanceOpen: false });
});

describe("Copernicus credit", () => {
  it("uses the wording the Sentinel licence asks for", () => {
    expect(COPERNICUS_CREDIT).toBe(
      "Contains modified Copernicus Sentinel data 2026",
    );
  });

  it("is shown on the map and opens the About & Credits dialog", async () => {
    render(
      <>
        <MapAttribution />
        <AboutModal />
      </>,
    );

    expect(screen.getByText(new RegExp(COPERNICUS_CREDIT))).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Credits" }));
    const dialog = await screen.findByRole("dialog", {
      name: "About & Credits",
    });
    expect(dialog).toHaveTextContent(COPERNICUS_CREDIT);
    expect(dialog).toHaveTextContent("MIT License");
  });

  it("is listed in the provenance dialog", () => {
    useUiStore.setState({ provenanceOpen: true });
    render(<ProvenanceModal />);
    expect(screen.getByRole("dialog")).toHaveTextContent(COPERNICUS_CREDIT);
  });
});
