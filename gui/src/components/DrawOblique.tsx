import { useEffect, useState } from 'react';
import { useObliqueSlice, useUiSlice } from '../hooks';
import { OverlayLayers } from './OverlaySvg';
import * as d3 from 'd3';
import { drawOblique } from './Graphs/drawOblique';

type Point = { x: number; y: number };

export const DrawOblique = ({
  width,
  height,
  factor,
  scale,
  position,
  layers,
}: {
  width: number;
  height: number;
  factor: number;
  scale: number;
  position: { x: number; y: number };
  layers: OverlayLayers;
}) => {
  const { interactiveLayerRef, uiLayerRef, svgRef } = layers;

  const {
    coordinates,
    isDefaultCoordinates,
    drawPoints,
    onChangeCoordinates,
    onSetCoordinatesCanvas,
    onSetIsDraggingPoint,
  } = useObliqueSlice();
  const { screenSizes, theme } = useUiSlice();

  const [localPoints, setLocalPoints] = useState<Point[]>(
    coordinates.map((point) => ({ x: point.x / factor, y: point.y / factor }))
  );
  const [mousePressed, setMousePressed] = useState(false);

  // Mirror the drag state into Redux so other parts of the page (e.g. the
  // focus overlay on the form panel) can react to it, whether the drag is
  // the initial rectangle placement or a later single-corner adjustment.
  useEffect(() => {
    onSetIsDraggingPoint(mousePressed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mousePressed]);

  useEffect(() => {
    return () => onSetIsDraggingPoint(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!interactiveLayerRef.current) return;
    const interactiveLayerSel = d3.select(interactiveLayerRef.current);
    const uiLayerSel = d3.select(uiLayerRef.current);

    interactiveLayerSel.selectAll('*').remove();

    drawOblique({
      layer: interactiveLayerSel,
      uiLayer: uiLayerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      localPoints,
      setLocalPoints,
      factor,
      setMousePressed,
      setPointsInStore: onChangeCoordinates,
      scale,
      isDefaultCoordinates,
    });
    // onChangeCoordinates is recreated every render but only ever dispatches based on its
    // arguments, no render state captured — adding it would refire this effect on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    interactiveLayerRef,
    uiLayerRef,
    coordinates,
    scale,
    position,
    factor,
    width,
    height,
    mousePressed,
    localPoints,
    isDefaultCoordinates,
    theme,
  ]);

  // To create initial points
  useEffect(() => {
    if (!svgRef.current) return;
    const svgSel = d3.select(svgRef.current);

    const onMouseDown = (event: any) => {
      if (isDefaultCoordinates === true && drawPoints === true) {
        setMousePressed(true);
        const point = d3.pointer(event, svgRef.current);

        const newPoints = [...localPoints];
        newPoints[0] = { x: point[0], y: point[1] };
        newPoints[1] = { x: point[0], y: point[1] };

        setLocalPoints(newPoints);
      }
    };

    const onMouseMove = (event: any) => {
      if (mousePressed === false || isDefaultCoordinates === false) return;
      const point = d3.pointer(event, svgRef.current);

      const newPoints = [...localPoints];
      newPoints[1] = { x: point[0], y: point[1] };

      setLocalPoints(newPoints);
    };

    const onMouseUp = (event: any) => {
      setMousePressed(false);
      if (isDefaultCoordinates === true && drawPoints === true) {
        const point = d3.pointer(event, svgRef.current);

        const newPoints = [...localPoints];
        newPoints[1] = { x: point[0], y: point[1] };

        onSetCoordinatesCanvas(newPoints, screenSizes);
      }
    };

    svgSel.on('mousedown.control_points', onMouseDown);
    svgSel.on('mousemove.control_points', onMouseMove);
    svgSel.on('mouseup.control_points', onMouseUp);

    return () => {
      svgSel.on('.control_points', null);
    };
    // localPoints/onSetCoordinatesCanvas intentionally excluded: localPoints is only read fresh
    // per pointer event (point[0] must stay fixed for the whole drag gesture), and
    // onSetCoordinatesCanvas only dispatches based on its arguments — including them would
    // reattach these D3 listeners on every mousemove during an active drag
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates, isDefaultCoordinates, drawPoints, mousePressed, svgRef, screenSizes]);

  useEffect(() => {
    setLocalPoints(coordinates.map((point) => ({ x: point.x / factor, y: point.y / factor })));
  }, [coordinates, isDefaultCoordinates, drawPoints, factor]);

  return null;
};
