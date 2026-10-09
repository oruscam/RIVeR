import { useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { useTranslation } from 'react-i18next';
import './components.css';
import { useDataSlice, useProjectSlice, useSectionSlice } from '../hooks';
import { QuiverData } from '../../commons/types';
import { drawQuiver } from './Graphs/drawQuiver';
import { getSectionTangent } from '../helpers/vectorComponents';
import { OverlayLayers } from './OverlaySvg';

interface QuiverProps {
  width: number;
  height: number;
  factor: number;
  data: QuiverData[];
  showMedian?: boolean;
  layers: OverlayLayers;
}

export const Quiver = ({ factor, data, showMedian, layers }: QuiverProps) => {
  const { images, quiver } = useDataSlice();
  const { projectDetails } = useProjectSlice();
  const { sections, activeSection, transformationMatrix } = useSectionSlice();
  const { t } = useTranslation();

  const { quiverLayerRef } = layers;

  // The active section's direction splits each vector into the streamwise
  // component the discharge uses and the crosswise one.
  const sectionPoints = sections[activeSection]?.dirPoints;
  const sectionTangent = useMemo(
    () => getSectionTangent(sectionPoints, transformationMatrix),
    [sectionPoints, transformationMatrix]
  );
  const isImperial = projectDetails.unitSistem === 'imperial';

  useEffect(() => {
    if (!quiverLayerRef.current) return;
    const quiverLayerSel = d3.select(quiverLayerRef.current);

    quiverLayerSel.selectAll('*').remove();
    if (quiver === null) return;

    drawQuiver(quiverLayerSel as any, data, factor, {
      isImperial,
      sectionTangent,
      labels: {
        east: t('Processing.vectorEast'),
        north: t('Processing.vectorNorth'),
        streamwise: t('Processing.vectorStreamwise'),
        crosswise: t('Processing.vectorCrosswise'),
        velocity: t('Graphs.velocity'),
      },
    });
  }, [quiver, images.active, factor, showMedian, quiverLayerRef, data, isImperial, sectionTangent, t]);

  return null;
};
