import { STORAGE_KEY, STORAGE_VERSION } from "./constants";
import { Position, StorageModel } from "./types";

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function defaultPositions(): Position[] {
  return [
    {
      id: uid(),
      name: "SAP",
      url: "sap.com",
      isin: "DE0007164600",
      exchange: "SC",
      amount: 21,
      rate: 232,
      want: null,
      sold: false,
      hide: false,
    },
  ];
}

export function createStorageModel(positions: Position[] = defaultPositions()): StorageModel {
  return {
    version: STORAGE_VERSION,
    positions,
    lastQuotes: {},
    lastRefresh: "",
  };
}

export function saveStorageModel(model: StorageModel) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
}

export function loadStorageModel(): StorageModel {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createStorageModel();
  }

  const parsed = JSON.parse(raw) as StorageModel | Position[];

  if (Array.isArray(parsed)) {
    return createStorageModel(parsed);
  }

  return {
    version: parsed.version || STORAGE_VERSION,
    positions: parsed.positions || defaultPositions(),
    lastQuotes: parsed.lastQuotes || {},
    lastRefresh: parsed.lastRefresh || "",
  };
}

export function savePositions(positions: Position[]) {
  const existing = loadStorageModel();
  saveStorageModel({ ...existing, positions });
}

export function loadPositions(): Position[] {
  return loadStorageModel().positions;
}

export function createEmptyPosition(): Position {
  return {
    id: "",
    name: "",
    url: "",
    isin: "",
    exchange: "SC",
    amount: 0,
    rate: 0,
    want: null,
    sold: false,
    hide: false,
  };
}
