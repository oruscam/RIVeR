export type CalibrationStatus = 'idle' | 'solving' | 'solved' | 'error';

export interface CalibrationVerdict {
  grade_overall: string;
  p90_rms: number;
  center_offset_max_pct: number;
  actions: string[];
}

export interface CalibrationSummary {
  frames_used: number;
  median_rms: number;
  coverage_percent: number;
  edge_reach_median: number;
  pose_spread_median_deg: number;
  heatmap_path: string;
  rms_hist_csv: string;
  overlays_dir: string;
  undistorted_dir: string;
  verdict: CalibrationVerdict;
}

export interface CsvRow {
  bin_center_px: number;
  count: number;
}

export interface CalibrationState {
  status: CalibrationStatus;
  imageDir: string;
  images: string[];
  usedImages: string[];
  summary: CalibrationSummary | null;
  csvRows: CsvRow[];
  heatmapBase64: string | null;
  overlayPaths: string[];
  profilePath: string;
  progressMsg: string;
  errorMsg: string;
}
