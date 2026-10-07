/** An input the project points at that is not on disk (spec §2, §3). */
export type MissingInput =
  | { kind: 'bathymetry'; section: string; path: string }
  | { kind: 'ipcamImages'; path: string };

/** What load-project reports about a project's missing inputs. */
export interface ProjectIssues {
  videoMissing: boolean;
  missingInputs: MissingInput[];
}

/** The video properties frames, matrix and masks depend on. */
export interface VideoSpec {
  width: number;
  height: number;
  fps: number;
}
