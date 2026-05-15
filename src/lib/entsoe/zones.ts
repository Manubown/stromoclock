export const BIDDING_ZONES = {
  AT: { eic: "10YAT-APG------L", label: "Austria (AT)" },
  "DE-LU": { eic: "10Y1001A1001A82H", label: "Germany–Luxembourg (DE-LU)" },
  NL: { eic: "10YNL----------L", label: "Netherlands (NL)" },
  IE: { eic: "10Y1001A1001A59C", label: "Ireland / SEM (IE)" },
  DK1: { eic: "10YDK-1--------W", label: "Denmark West (DK1)" },
  DK2: { eic: "10YDK-2--------M", label: "Denmark East (DK2)" },
  SE1: { eic: "10Y1001A1001A44P", label: "Sweden Luleå (SE1)" },
  SE2: { eic: "10Y1001A1001A45N", label: "Sweden Sundsvall (SE2)" },
  SE3: { eic: "10Y1001A1001A46L", label: "Sweden Stockholm (SE3)" },
  SE4: { eic: "10Y1001A1001A47J", label: "Sweden Malmö (SE4)" },
  NO1: { eic: "10YNO-1--------2", label: "Norway Oslo (NO1)" },
  NO2: { eic: "10YNO-2--------T", label: "Norway Kristiansand (NO2)" },
  NO3: { eic: "10YNO-3--------J", label: "Norway Trondheim (NO3)" },
  NO4: { eic: "10YNO-4--------9", label: "Norway Tromsø (NO4)" },
  NO5: { eic: "10Y1001A1001A48H", label: "Norway Bergen (NO5)" },
  FI: { eic: "10YFI-1--------U", label: "Finland (FI)" },
} as const satisfies Record<string, { eic: string; label: string }>;

export type Zone = keyof typeof BIDDING_ZONES;

export const ZONE_KEYS = Object.keys(BIDDING_ZONES) as Zone[];

export function isZone(value: string): value is Zone {
  return value in BIDDING_ZONES;
}

export function eicFor(zone: Zone): string {
  return BIDDING_ZONES[zone].eic;
}
