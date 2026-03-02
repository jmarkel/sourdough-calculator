export type LineItem = {
  id: string;
  name: string;
  pct: string;
  grams: string;
};

export type LineItemParsed = LineItem & {
  gramsNum: number;
  pctFrac: number;
  mode: "pct" | "grams" | "empty";
};

export type LineItemComputed = {
  id: string;
  name: string;
  mode: "pct" | "grams";
  grams: number;
  pct: number;
};

export type FlourPart = {
  id: string;
  name: string;
  pct: string;
};

export type FlourPartParsed = FlourPart & {
  pctFrac: number;
};

export type FlourPartComputed = {
  id: string;
  name: string;
  pct: number;
  grams: number;
};

export type CalcOk = {
  ok: true;
  flour: number;
  water: number;
  salt: number;
  levain: number;
  additions: LineItemComputed[];
  inclusions: LineItemComputed[];
  inclusionsTotal: number;
  doughWithInclusions: number;
  levainBuildFlour: number;
  levainBuildWater: number;
  effectiveHydrationPct: number;
  prefermentedFlourPct: number;
  flourBreakdown: FlourPartComputed[];
  checks: {
    baseTotal: number;
    targetBaseDough: number;
    denom: number;
    flourBreakdownPctTotal: number;
  };
};

export type CalcErr = { ok: false; error: string };
export type CalcResult = CalcOk | CalcErr;

export type PersistedStateV1 = {
  version: 1;
  recipeName?: string;
  baseDoughG: string;
  hydrationPct: string;
  saltPct: string;
  levainPct: string;
  levainHydrationPct: string;
  showEffectiveHydration: boolean;
  additions: LineItem[];
  inclusions: LineItem[];
  flourParts: FlourPart[];
  notes?: string;
};

export type SavedRecipeV1 = {
  name: string;
  savedAt: number;
  state: PersistedStateV1;
};
