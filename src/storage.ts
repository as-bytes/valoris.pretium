import { STORAGE_VERSION } from "./constants";
import { Position, Quote, StorageModel } from "./types";

export function downloadConfig(
  positions: Position[],
  lastRefresh: string,
  lastQuotes: Record<string, Quote>
): void {
  const model: StorageModel = {
    version: STORAGE_VERSION,
    positions,
    lastQuotes,
    lastRefresh,
  };

  const data = JSON.stringify(model, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const fileUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  link.href = fileUrl;
  link.download = `portfolio-config-${stamp}.json`;
  link.click();
  URL.revokeObjectURL(fileUrl);
}
