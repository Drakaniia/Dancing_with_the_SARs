/// <reference lib="webworker" />
import type { ChangeType, TileCoord } from "@/shared/types/dataset";

interface WorkerMessage {
  type: "parse" | "tile";
  buffer: ArrayBuffer;
  changeType: ChangeType;
  date: string;
  coord?: TileCoord;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, changeType, date } = e.data;
  if (type === "parse") {
    self.postMessage({ type: "parsed", changeType, date });
  }
};
