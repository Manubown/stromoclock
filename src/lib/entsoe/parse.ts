import { XMLParser } from "fast-xml-parser";

export type HourlyPrice = {
  start: string;
  end: string;
  eurPerMWh: number;
};

type TimeSeries = {
  Period:
    | {
        timeInterval: { start: string; end: string };
        resolution: string;
        Point: { position: number; "price.amount": number } | Array<{ position: number; "price.amount": number }>;
      }
    | Array<{
        timeInterval: { start: string; end: string };
        resolution: string;
        Point: { position: number; "price.amount": number } | Array<{ position: number; "price.amount": number }>;
      }>;
};

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: true,
  numberParseOptions: { hex: false, leadingZeros: false, eNotation: false },
});

function durationMinutes(resolution: string): number {
  // ISO 8601 duration subset used by ENTSO-E: PT60M, PT30M, PT15M
  const match = /PT(\d+)M/.exec(resolution);
  return match ? Number(match[1]) : 60;
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Parse ENTSO-E A44 (day-ahead prices) Publication_MarketDocument XML.
 * Returns hourly prices in chronological order. Handles missing positions
 * by forward-filling from the previous known price (ENTSO-E convention).
 */
export function parseDayAheadXml(xml: string): HourlyPrice[] {
  const doc = parser.parse(xml) as {
    Publication_MarketDocument?: { TimeSeries?: TimeSeries | TimeSeries[] };
    Acknowledgement_MarketDocument?: { Reason?: { text?: string } };
  };

  if (doc.Acknowledgement_MarketDocument) {
    const reason = doc.Acknowledgement_MarketDocument.Reason?.text ?? "Unknown";
    throw new Error(`ENTSO-E returned acknowledgement: ${reason}`);
  }

  const root = doc.Publication_MarketDocument;
  if (!root?.TimeSeries) return [];

  const seriesList = asArray(root.TimeSeries);
  const result: HourlyPrice[] = [];

  for (const series of seriesList) {
    const periods = asArray(series.Period);
    for (const period of periods) {
      const stepMin = durationMinutes(period.resolution);
      const startMs = Date.parse(period.timeInterval.start);
      const endMs = Date.parse(period.timeInterval.end);
      const expectedCount = Math.round((endMs - startMs) / (stepMin * 60_000));

      const points = asArray(period.Point)
        .map((p) => ({ position: Number(p.position), price: Number(p["price.amount"]) }))
        .sort((a, b) => a.position - b.position);

      let lastPrice = points[0]?.price ?? 0;
      const byPosition = new Map(points.map((p) => [p.position, p.price]));

      for (let i = 1; i <= expectedCount; i++) {
        const price = byPosition.get(i);
        if (price !== undefined) lastPrice = price;
        const slotStart = new Date(startMs + (i - 1) * stepMin * 60_000);
        const slotEnd = new Date(startMs + i * stepMin * 60_000);
        result.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          eurPerMWh: lastPrice,
        });
      }
    }
  }

  result.sort((a, b) => a.start.localeCompare(b.start));
  return result;
}
