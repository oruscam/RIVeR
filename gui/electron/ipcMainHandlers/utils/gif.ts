
/**
 * Calculate GIF dimensions maintaining aspect ratio
 * @param imgWidth | original image width
 * @param imgHeight | original image height
 * @param factor | scaling factor
 * @returns object containing output width, height, and drawing coordinates
 */

import { getPositionSectionText } from "../../../commons/sectionTextPosition";
import { Quiver, Section } from "../../../commons/types";
import { getQuiverValues } from "../../../commons/vectors";

const getGifDimensions = ( imgWidth: number, imgHeight: number, factor:number ): { outWidth: number; outHeight: number; dw: number; dh: number; dx: number; dy: number; } => {
    const outWidth = Math.round(imgWidth * factor);
    const outHeight = Math.round(imgHeight * factor);

    const originalRatio = imgWidth / imgHeight;
    const outRatio = outWidth / outHeight;

    let dw = outWidth, dh = outHeight, dx = 0, dy = 0;
    if ( originalRatio > outRatio ) {
        dw = outWidth;
        dh = Math.round(outWidth / originalRatio);
        dy = Math.round((outHeight - dh) / 2);
    } else {
        dh = outHeight;
        dw = Math.round(outHeight * originalRatio);
        dx = Math.round((outWidth - dw) / 2);
    }

    return { outWidth, outHeight, dw, dh, dx, dy };
}

/**
 * Load section values for GIF generation
 * This function calculates the positions and rotations for section names based on the provided section points and scaling factor.
 * This values are used to draw section names on each frame of the GIF.
 * @param sections | array of Section objects containing section and direction points
 * @param width | original image width
 * @param height | original image height
 * @param factor | scaling factor
 * @returns array of objects containing resized points, name position, rotation, and section name
 */

interface SectionValues {
    dirPoints: { x: number; y: number; }[];
    sectionPoints: { x: number; y: number; }[];
    namePoint: { x: number; y: number; };
    rotation: number;
    name: string;
}

const loadSectionValues = ( sections: Section[], width: number, height: number, factor: number ): SectionValues[] => {
    const values = sections.map((section) => {
        const { dirPoints, sectionPoints } = section

        const resizeFactor = width / (width * factor);

        const { point, rotation } = getPositionSectionText(sectionPoints[0], sectionPoints[1], width * factor, height * factor, resizeFactor);

        return {
            dirPoints: dirPoints.map(p => ({ x: p.x * factor,  y: p.y * factor })),
            sectionPoints: sectionPoints.map(p => ({ x: p.x * factor,  y: p.y * factor })),
            namePoint: { x: point.x * factor, y: (point.y * factor) + 15 },
            rotation,
            name: section.name
        }
    })

    return values;
}

/**
 * 
 * @param ctx 
 * @param watermarkImage 
 * @param canvasWidth 
 * @param canvasHeight 
 */
const drawWatermark = (
    ctx,
    watermarkImage: any,
    canvasWidth: number,
    canvasHeight: number,
) => {
        const opacity = 1
        const scale = 0.1;  // 10%
        const margin = 20;

        const originalW = watermarkImage.width;
        const originalH = watermarkImage.height;

        const canvasW = canvasWidth;
        const canvasH = canvasHeight;

        // We want the watermark to occupy 10% of the image WIDTH
        const targetWidth = canvasW * scale;
        const aspectRatio = originalW / originalH;

        // Calculate the corresponding height
        const targetHeight = targetWidth / aspectRatio;

        // If for some reason it is taller than 10% of the height, adjust using height
        let finalW = targetWidth;
        let finalH = targetHeight;

        if (finalH > canvasH * scale) {
        // scale according to height
        finalH = canvasH * scale;
        finalW = finalH * aspectRatio;
        }

        // Calculate the position at bottom-right corner
        const x = canvasWidth - finalW - margin;
        const y = canvasHeight - finalH - margin;

        // Save the current context
        ctx.save();

        // Apply transparency
        ctx.globalAlpha = opacity;

        // Draw the watermark
        ctx.drawImage(
            watermarkImage,
            0, 0, watermarkImage.width, watermarkImage.height,
            x, y, finalW, finalH
        );

        // Restore the context
        ctx.restore();
};


const drawSection = (ctx, values: SectionValues[], factor) => {
    const lineWidth = 4 * factor;

    values.forEach((section) => {
        const { dirPoints, sectionPoints, namePoint, rotation, name } = section

        // Draw direction line - it is a solid line drawn by the user
        ctx.beginPath();
        ctx.moveTo(dirPoints[0].x, dirPoints[0].y);
        ctx.lineTo(dirPoints[1].x, dirPoints[1].y);
        ctx.strokeStyle = '#545454';
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.closePath();

        // Draw section line - it is a dashed line in the same direction than the direction line, but with maybe a different length
        ctx.beginPath();
        ctx.setLineDash([5, 10]);
        ctx.strokeStyle = '#545454';
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round'; 
        ctx.moveTo(sectionPoints[0].x, sectionPoints[0].y);
        ctx.lineTo(sectionPoints[1].x, sectionPoints[1].y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.closePath();

        // Save context before drawing text
        ctx.save()

        // Translate and rotate context to draw the text
        // If rotation can be undefined, use 0
        const rot = typeof rotation === 'number' ? rotation : 0
        ctx.translate(namePoint.x, namePoint.y)
        ctx.rotate(rot * Math.PI / 180)

        // Text style
        // Adjust font size based on factor
        const fontSize = 30 * factor
        ctx.font = `${fontSize}px Arial`
        ctx.fillStyle = '#222'
        ctx.fontWeight = '500'

        // Draw text
        ctx.fillStyle = '#000000'
        ctx.fillText(name, 0, 0)

        ctx.restore()
    })
}

const drawQuiver = (
  ctx,
  quiver: Quiver,
  frameIndex: number,
  transformationMatrix: number[][],
  factor: number,
) => {
  // Get quiver data for the current frame
  const { data } = getQuiverValues(quiver, false, frameIndex, 1, 30, transformationMatrix);

  // Used for avoid arrows going beyond the line end
  const delta = 3
  
  // Set line width
  const lineWidth = 4 * factor
  const amplitudeFactor = 15;
  
  // Draw each vector as an arrow
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const x1 = d.x * factor;
    const y1 = d.y * factor;
    const dx = (d.u * amplitudeFactor * factor) ;
    const dy = (d.v * amplitudeFactor * factor) ;
    const x2 = x1 + dx;
    const y2 = y1 + dy;

    // Line
    ctx.beginPath();
    ctx.lineWidth = 4 * factor;
    ctx.moveTo(x1, y1);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const newLength = Math.hypot(x2 - x1, y2 - y1) - delta;

    // New end point to avoid overlapping with arrow head
    const newX2 = x1 + Math.cos(angle) * newLength;
    const newY2 = y1 + Math.sin(angle) * newLength;
    ctx.lineTo(newX2 , newY2);
    ctx.strokeStyle = d.color;
    ctx.stroke();


    // Draw the arrow
    const arrowLength = lineWidth * 4;

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - arrowLength * Math.cos(angle - Math.PI / 6),
      y2 - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - arrowLength * Math.cos(angle + Math.PI / 6),
      y2 - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();
  }
};

export { getGifDimensions, loadSectionValues, drawWatermark, drawSection, drawQuiver };