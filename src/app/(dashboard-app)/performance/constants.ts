import type { NormalizedWeekday, SectorKey } from "./types";

type SectorMeta = {
  label: string;
  color: string;
  order: number;
};

type WeekdayMeta = {
  label: string;
  order: number;
};

export const SECTOR_METADATA: Record<SectorKey, SectorMeta> = {
  chien: { label: "Ngành Chiên", color: "#ec4899", order: 0 },
  au: { label: "Ngành Ấu", color: "#22c55e", order: 1 },
  thieu: { label: "Ngành Thiếu", color: "#3b82f6", order: 2 },
  nghia: { label: "Ngành Nghĩa", color: "#facc15", order: 3 },
};

export const WEEKDAY_METADATA: Record<NormalizedWeekday, WeekdayMeta> = {
  sunday: { label: "Chủ nhật", order: 0 },
  thursday: { label: "Thứ 5", order: 1 },
};

export const SECTOR_KEYS = Object.keys(SECTOR_METADATA) as SectorKey[];
export const WEEKDAY_KEYS = Object.keys(WEEKDAY_METADATA) as NormalizedWeekday[];

export const MAX_CHART_POINTS = 8;
