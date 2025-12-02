export type SectorKey = "chien" | "au" | "thieu" | "nghia";

export type NormalizedWeekday = "sunday" | "thursday";

export type ChartDataPoint = {
  eventDate: string;
  week: string;
  chien: number;
  au: number;
  thieu: number;
  nghia: number;
  total: number;
};

export type ClassBreakdownEntry = {
  classId: string;
  className: string;
  present: number;
};

export type ClassBreakdown = {
  sectorKey: SectorKey;
  weekday: NormalizedWeekday;
  eventDate: string;
  label: string;
  classes: ClassBreakdownEntry[];
};

export type PerformancePageData = {
  charts: {
    sunday: ChartDataPoint[];
    thursday: ChartDataPoint[];
  };
  classBreakdowns: ClassBreakdown[];
};
