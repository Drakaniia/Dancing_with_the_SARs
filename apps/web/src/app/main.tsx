import React from "react";
import ReactDOM from "react-dom/client";
import { useDatasetStore } from "@/stores/datasetStore";
import App from "./App";
import "../index.css";

// Start the manifest download now, not from an effect: the first render creates the WebGL map,
// a long task that would otherwise hold the request back by a second or more.
void useDatasetStore.getState().loadManifestAndTables();

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
