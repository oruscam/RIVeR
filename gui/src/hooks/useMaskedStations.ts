import { useEffect, useMemo, useState } from 'react';
import { useDataSlice } from './useDataSlice';
import { useSectionSlice } from './useSectionSlice';
import {
  getSectionSearchLines,
  isSegmentMasked,
  isWindowMasked,
  loadMaskRaster,
  searchLineCenters,
  type MaskRaster,
} from '../helpers';
import { STIV_DEFAULT_HEIGHT_ROI_M } from '../constants/constants';

/**
 * What the next Analyze will skip in the active section: per station, whether its
 * STIV search line / iWave window is entirely under the Processing mask. A live
 * preview from the mask overlay; the run's own record is section.data.*_skip_profile.
 * Pass the iWave window (m) or null to skip the iWave preview.
 */
export const useMaskedStations = (iwaveWindowM: number | null) => {
  const { sections, activeSection, transformationMatrix } = useSectionSlice();
  const { processing } = useDataSlice();
  const [raster, setRaster] = useState<MaskRaster | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMaskRaster(processing.maskPath).then((r) => {
      if (!cancelled) setRaster(r);
    });
    return () => {
      cancelled = true;
    };
  }, [processing.maskPath]);

  const section = sections[activeSection];
  const heightRoi = processing.form.heightRoi;

  return useMemo(() => {
    const lines = getSectionSearchLines({
      sectionPoints: section?.sectionPoints,
      numStations: section?.numStations,
      data: section?.data,
      heightRoiM: heightRoi > 0 ? heightRoi : STIV_DEFAULT_HEIGHT_ROI_M,
      matrix: transformationMatrix,
    });
    const stiv = lines.map((l) => isSegmentMasked(raster, l.a, l.b));
    const iwave =
      iwaveWindowM === null
        ? lines.map(() => false)
        : searchLineCenters(lines, transformationMatrix).map((c) =>
            isWindowMasked(raster, c, iwaveWindowM, transformationMatrix)
          );
    return { stiv, iwave };
  }, [section?.sectionPoints, section?.numStations, section?.data, heightRoi, transformationMatrix, raster, iwaveWindowM]);
};
