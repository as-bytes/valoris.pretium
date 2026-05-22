import { Position } from "./types";
import { uid } from "./utils";

export function parseFinZeroCSV(text: string): Position[] {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const positions: Position[] = [];

  // Skip header: Name;ISIN;WKN;Art;Anzahl;Verfügbar;Kaufkurs;Kaufwert;Kurs;Kurszeit;Kursdatum;Wert;Erfolg [%];Erfolg [EUR];Notiz
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = line.split(";");
    if (fields.length < 14) continue;

    const name = fields[0];
    const isin = fields[1];
    const amountStr = fields[4];
    const rateStr = fields[6];

    if (!isin || !amountStr || !rateStr) continue;

    // German number format: 1.638 or 447,145
    // Remove thousand separator (.) and replace decimal separator (,) with (.)
    const parseGermanNumber = (s: string) =>
      parseFloat(s.replace(/\./g, "").replace(",", "."));

    const amount = parseGermanNumber(amountStr);
    const rate = parseGermanNumber(rateStr);

    if (isNaN(amount) || isNaN(rate)) continue;

    positions.push({
      id: uid(),
      name: name.trim(),
      url: null,
      isin: isin.trim().toUpperCase(),
      exchange: "FinZero",
      amount,
      rate,
      want: null,
      sold: false,
      hide: false,
    });
  }

  return positions;
}

export function parseValorisJSON(text: string): Position[] {
  try {
    const model = JSON.parse(text);
    // Support both the StorageModel structure and a simple array of positions
    if (Array.isArray(model)) {
      return model;
    }
    return model.positions || [];
  } catch {
    console.error("Failed to parse Valoris JSON");
    return [];
  }
}
