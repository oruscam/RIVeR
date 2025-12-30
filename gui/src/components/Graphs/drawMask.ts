import * as d3 from 'd3'

/**
 * Renders an interactive SVG mask editor with draggable points and edge controls
 * 
 * @param svg - D3 selection of the SVG element to render into
 * @param svgRef - React ref to the SVG element (used for coordinate calculations)
 * @param isCtrlPressed - Whether the Control key is currently pressed
 * @param addPoint - Callback to add a new point at a specific index
 * @param setDragStart - Callback to set the starting position for dragging the entire mask
 * @param setDragging - Callback to set which individual point is being dragged
 * @param setDraggingAll - Callback to toggle dragging the entire mask
 * @param points - Array of mask points in image coordinates
 * @param transformToViewport - Function to convert image coordinates to viewport coordinates
 * @param transformToImage - Function to convert viewport coordinates to image coordinates
 */

export const drawMask = (
    svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
    svgRef: React.RefObject<SVGSVGElement>,
    isCtrlPressed: boolean,
    addPoint: (index: number, x: number, y: number) => void,
    setDragStart: (point: { x: number; y:  number } | null) => void,
    setDragging: (index:  number | null) => void,
    setDraggingAll:  (draggingAll: boolean) => void,
    points: { id: string; x: number; y: number }[],
    transformToViewport: (x: number, y: number) => { x: number; y: number },
    transformToImage: (x:  number, y: number) => { x: number; y: number }
) => {
    // Check if this is the first render by seeing if SVG definitions exist
    const isFirstRender = svg.select('defs').empty();
    
    // Set transition duration:  0ms when dragging for smooth real-time updates, 150ms otherwise
    const t = svg.transition().duration(0).ease(d3.easeQuadOut);
    
    // ========================
    // Initialize SVG definitions (patterns, gradients, etc.) on first render
    // ========================
    if (isFirstRender) {
        const defs = svg.append('defs');
        
        // Create a diagonal line pattern to fill the polygon mask area
        const pattern = defs.append('pattern')
            .attr('id', 'dashFill')
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', 10)
            .attr('height', 10);

        // Draw diagonal lines in the pattern
        pattern.append('path')
            .attr('d', 'M0 10 L10 0')
            .attr('stroke', '#ED6B57')
            .attr('stroke-width', 1);
    }

    // ========================
    // Polygon - The main mask shape
    // Always update (not using D3's enter/exit pattern)
    // ========================
    
    // Convert all points from image coordinates to viewport coordinates
    const transformedPoints = points.map(p => transformToViewport(p.x, p.y));
    
    // Format points as SVG polygon points string:  "x1,y1 x2,y2 x3,y3"
    const polygonPoints = transformedPoints.map(p => `${p.x},${p.y}`).join(' ');
    
    // Get or create the polygon element
    let polygon = svg.select('polygon.mask-polygon');
    if (polygon.empty()) {
        // Create polygon on first render
        polygon = svg.append('polygon')
            .attr('class', 'mask-polygon')
            .attr('fill', 'url(#dashFill)')  // Use diagonal pattern fill
            .attr('stroke', 'none')
            .attr('points', polygonPoints);
    } else {
        // Update existing polygon with smooth transition
        polygon.transition(t as any)
            .attr('points', polygonPoints);
    }

    // Toggle polygon interactivity based on Ctrl key state
    // When Ctrl is pressed, the polygon becomes draggable to move the entire mask
    polygon
        .style('pointer-events', isCtrlPressed ? 'auto' : 'none')
        .style('cursor', isCtrlPressed ? 'move' : 'default');

    // Handle mousedown on polygon (only when Ctrl is pressed)
    polygon
        .on('mousedown', function(event) {
            if (isCtrlPressed) {
                event.stopPropagation();
                
                // Get mouse position relative to SVG element
                const rect = svgRef.current! .getBoundingClientRect();
                const vx = event.clientX - rect.left;
                const vy = event.clientY - rect.top;
                
                // Store starting position and activate "drag all" mode
                setDragStart({ x: vx, y:  vy });
                setDraggingAll(true);
            }
        });

    // ========================
    // Edges data - Calculate midpoints and endpoints for each polygon edge
    // ========================
    const edgesData = points.map((a, i) => {
        // Get next point (wrap around to first point at the end)
        const b = points[(i + 1) % points.length];
        
        // Convert both points to viewport coordinates
        const va = transformToViewport(a.x, a.y);
        const vb = transformToViewport(b.x, b.y);
        
        // Calculate midpoint for the "add point" button
        const mx = (va.x + vb.x) / 2;
        const my = (va.y + vb.y) / 2;
        
        return { 
            va,      // Start point in viewport coords
            vb,      // End point in viewport coords
            mx,      // Midpoint x in viewport coords
            my,      // Midpoint y in viewport coords
            index:  i,
            id: `edge-${a.id}-${b.id}`  // Unique ID for D3 data binding
        };
    });

    // ========================
    // Lines - Dashed lines connecting mask points
    // ========================
    const lines = svg.selectAll('line.edge-line').data(edgesData, (d: any) => d.id);
    
    // Use D3's enter/update/exit pattern
    lines.enter()
        .append('line')
        .attr('class', 'edge-line')
        .attr('stroke', '#ED6B57')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6 4')  // Dashed line pattern
        .style('pointer-events', 'none')  // Lines are not interactive
        .attr('x1', d => d.va.x)
        .attr('y1', d => d.va.y)
        .attr('x2', d => d.vb.x)
        .attr('y2', d => d.vb.y)
        .merge(lines as any)  // Merge with existing elements
        .transition(t as any)
        .attr('x1', d => d.va.x)
        .attr('y1', d => d.va.y)
        .attr('x2', d => d.vb.x)
        .attr('y2', d => d.vb.y);
    
    lines.exit().remove();  // Remove lines for deleted edges

    // ========================
    // Plus circles - Visual indicator for "add point" buttons at edge midpoints
    // ========================
    const plusCircles = svg.selectAll('circle.plus-circle').data(edgesData, (d: any) => d.id);
    
    plusCircles.enter()
        .append('circle')
        .attr('class', 'plus-circle')
        .attr('r', 9)
        .attr('fill', '#ED6B57')
        .style('pointer-events', 'none')  // Not directly interactive (hit area handles events)
        .attr('cx', d => d.mx)
        .attr('cy', d => d.my)
        .merge(plusCircles as any)
        .transition(t as any)
        .attr('cx', d => d.mx)
        .attr('cy', d => d.my);
    
    plusCircles.exit().remove();

    // ========================
    // Plus text - "+" symbol inside the circle
    // ========================
    const plusTexts = svg.selectAll('text.plus-text').data(edgesData, (d: any) => d.id);
    
    plusTexts.enter()
        .append('text')
        .attr('class', 'plus-text')
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '16px')
        .style('pointer-events', 'none')
        .text('+')
        .attr('x', d => d.mx)
        .attr('y', d => d.my + 5)  // Offset for vertical centering
        .merge(plusTexts as any)
        .transition(t as any)
        .attr('x', d => d.mx)
        .attr('y', d => d.my + 5);
    
    plusTexts.exit().remove();

    // ========================
    // Plus rectangles (hit areas) - Invisible rectangles for easier clicking
    // ========================
    const plusRects = svg.selectAll('rect.plus-rect').data(edgesData, (d: any) => d.id);
    
    const plusRectsEnter = plusRects.enter()
        .append('rect')
        .attr('class', 'plus-rect')
        .attr('width', 50)   // Larger than the circle for easier interaction
        .attr('height', 50)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .style('pointer-events', 'auto')
        .attr('x', d => d.mx - 25)  // Center on midpoint
        .attr('y', d => d.my - 25);

    plusRectsEnter.merge(plusRects as any)
        .transition(t as any)
        .attr('x', d => d.mx - 25)
        .attr('y', d => d.my - 25);

    // Event handlers for plus buttons
    svg.selectAll('rect.plus-rect')
        // Hover effect:  enlarge circle when hovering (disabled when Ctrl is pressed)
        .on('mouseover', function(_event, d:  any) {
            if (! isCtrlPressed) {
                d3.select(`circle.plus-circle:nth-of-type(${d.index + 1})`)
                    .transition()
                    .duration(150)
                    .attr('r', 12);
            }
        })
        // Restore circle size when mouse leaves
        .on('mouseout', function(_event, d: any) {
            if (!isCtrlPressed) {
                d3.select(`circle.plus-circle:nth-of-type(${d.index + 1})`)
                    .transition()
                    .duration(150)
                    .attr('r', 9);
            }
        })
        // Click to add a new point at the edge midpoint
        .on('click', function(event, d: any) {
            if (!isCtrlPressed) {
                event.stopPropagation();
                
                // Convert viewport coordinates back to image coordinates
                const imgCoords = transformToImage(d.mx, d.my);
                
                // Insert new point after the current edge's start point
                addPoint(d.index + 1, imgCoords.x, imgCoords.y);
            }
        });
    
    plusRects.exit().remove();

    // ========================
    // Draggable points - The main control points that define the mask shape
    // IMPORTANT:  Rendered last so they appear on top of plus buttons
    // ========================
    const circles = svg.selectAll('circle.point').data(points, (d: any) => d.id);
    
    const circlesEnter = circles.enter()
        .append('circle')
        .attr('class', 'point')
        .attr('r', 7)
        .attr('fill', '#ED6B57')
        .style('cursor', 'pointer')
        .style('pointer-events', 'auto')
        .attr('cx', d => transformToViewport(d.x, d.y).x)
        .attr('cy', d => transformToViewport(d.x, d.y).y);

    circlesEnter.merge(circles as any)
        .transition(t as any)
        .attr('cx', d => transformToViewport(d.x, d.y).x)
        .attr('cy', d => transformToViewport(d.x, d.y).y);

    // Event handlers for individual points
    svg.selectAll('circle.point')
        // Hover effect: enlarge point (disabled when Ctrl is pressed)
        .on('mouseover', function() {
            if (!isCtrlPressed) {
                d3.select(this).transition().duration(150).attr('r', 10);
            }
        })
        // Restore point size when mouse leaves
        .on('mouseout', function() {
            if (!isCtrlPressed) {
                d3.select(this).transition().duration(150).attr('r', 7);
            }
        })
        // Start dragging individual point (disabled when Ctrl is pressed)
        .on('mousedown', function(event, d: any) {
            if (!isCtrlPressed) {
                event.stopPropagation();
                
                // Find the point's index in the array
                const index = points.findIndex(p => p.id === d.id);
                
                // Activate "drag point" mode
                setDragging(index);
            }
        });
    
    circles.exit().remove();

    // Force points to always render on top of other elements
    // This ensures points are selectable even when near plus buttons
    svg.selectAll('circle.point').raise();
}