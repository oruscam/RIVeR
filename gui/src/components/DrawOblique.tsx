import { useEffect, useState } from "react";
import { useObliqueSlice, useUiSlice } from "../hooks";
import { OverlayLayers } from "./OverlaySvg";
import * as d3 from "d3";
import { drawOblique } from "./Graphs/drawOblique";

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

  const { coordinates, isDefaultCoordinates, drawPoints, onChangeCoordinates, onSetCoordinatesCanvas } = useObliqueSlice();
  const { screenSizes } = useUiSlice()

  const [localPoints, setLocalPoints] = useState<Point[]>(coordinates.map((point) => ({ x: point.x / factor, y: point.y / factor })));
  const [mousePressed, setMousePressed] = useState(false);


  useEffect(() => {
    if (!interactiveLayerRef.current) return;
    const interactiveLayerSel = d3.select(interactiveLayerRef.current);
    const uiLayerSel = d3.select(uiLayerRef.current);

    interactiveLayerSel.selectAll("*").remove();

    drawOblique({
      layer: interactiveLayerSel,
      uiLayer: uiLayerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      localPoints,
      setLocalPoints,
      factor,
      setMousePressed,
      setPointsInStore: onChangeCoordinates,
      scale,
      isDefaultCoordinates
    })

  }, [interactiveLayerRef, coordinates, scale, position, factor, width, height, mousePressed, localPoints, isDefaultCoordinates]);

  // To create initial points
  useEffect(() => {
    if (!svgRef.current) return;
    const svgSel = d3.select(svgRef.current);

    const onMouseDown = (event: any) => {
      if ( isDefaultCoordinates === true && drawPoints === true  ) {
        setMousePressed(true);
        const point = d3.pointer(event, svgRef.current);

        const newPoints = [...localPoints ];
        newPoints[0] = { x: point[0], y: point[1] };
        newPoints[1] = { x: point[0], y: point[1] };


        setLocalPoints(newPoints);
      }
    }

    const onMouseMove = (event: any) => {
      if(mousePressed === false || isDefaultCoordinates === false) return;
      const point = d3.pointer(event, svgRef.current);

      const newPoints = [...localPoints];
      newPoints[1] = { x: point[0], y: point[1] };
      
      setLocalPoints(newPoints);
    }

    const onMouseUp = (event: any) => {
      setMousePressed(false);
      if ( isDefaultCoordinates === true && drawPoints === true ) {
        const point = d3.pointer(event, svgRef.current);

        const newPoints = [...localPoints ];
        newPoints[1] = { x: point[0], y: point[1] };

        onSetCoordinatesCanvas(
          newPoints,
          screenSizes
        )
      }
    }

    svgSel.on("mousedown.control_points", onMouseDown);
    svgSel.on("mousemove.control_points", onMouseMove);
    svgSel.on("mouseup.control_points", onMouseUp);

    return () => {
      svgSel.on(".control_points", null);
    };
  }, [coordinates, isDefaultCoordinates, drawPoints, mousePressed]);


  useEffect(() => {
    setLocalPoints(coordinates.map((point) => ({ x: point.x / factor, y: point.y / factor })));
  }, [coordinates, isDefaultCoordinates, drawPoints, factor])

  return null;
};