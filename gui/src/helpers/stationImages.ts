/**
 * One slot per station (station id k at index k − 1), '' where the run wrote no
 * image. STIV and iWave skip stations, so the files alone are a sparser list
 * than the stations; aligning them keeps the carousel index == station index
 * for every consumer (viewer, angle tuner, markers).
 */
export const alignStationImages = (stations: number[], paths: string[], count: number): string[] => {
  const aligned = Array.from({ length: count }, () => '');
  stations.forEach((id, i) => {
    if (id >= 1 && id <= count) aligned[id - 1] = paths[i];
  });
  return aligned;
};

export const skipReasonLabelKey = (reason: string | null | undefined) =>
  reason === 'masked'
    ? ('Processing.stationMasked' as const)
    : reason === 'dry'
      ? ('Processing.stationDry' as const)
      : ('Processing.stationNoResult' as const);
