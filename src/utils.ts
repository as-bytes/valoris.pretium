import { STORAGE_KEY } from "./constants";
import { Position } from "./types";

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function savePositions(positions: Position[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

export function loadPositions(): Position[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
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

export function createEmptyPosition(): Position {
  return {
    id: "",
    name: "",
    url: "",
    isin: "",
    exchange: "",
    amount: 0,
    rate: 0,
    want: null as number | null,
    sold: false,
    hide: false,
  };
}
