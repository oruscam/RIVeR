/**
 * Calculate GIF dimensions maintaining aspect ratio
 * @param imgWidth | original image width
 * @param imgHeight | original image height
 * @param factor | scaling factor
 * @returns object containing output width, height, and drawing coordinates
 */

import { getPositionSectionText } from '../../../commons/sectionTextPosition';
import { getQuiverValues } from '../../../commons/vectors';

const getGifDimensions = (imgWidth, imgHeight, factor) => {
  const outWidth = Math.round(imgWidth * factor);
  const outHeight = Math.round(imgHeight * factor);

  const originalRatio = imgWidth / imgHeight;
  const outRatio = outWidth / outHeight;

  let dw = outWidth,
    dh = outHeight,
    dx = 0,
    dy = 0;
  if (originalRatio > outRatio) {
    dw = outWidth;
    dh = Math.round(outWidth / originalRatio);
    dy = Math.round((outHeight - dh) / 2);
  } else {
    dh = outHeight;
    dw = Math.round(outHeight * originalRatio);
    dx = Math.round((outWidth - dw) / 2);
  }

  return { outWidth, outHeight, dw, dh, dx, dy };
};

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

const loadSectionValues = (sections, width, height, factor) => {
  console.log('width: ', width, 'height: ', height, 'factor: ', factor);
  const values = sections.map((section) => {
    const { dirPoints, sectionPoints } = section;

    const resizeFactor = width / (width * factor);

    const { point, rotation } = getPositionSectionText(
      sectionPoints[0],
      sectionPoints[1],
      width * factor,
      height * factor,
      resizeFactor
    );

    return {
      dirPoints: dirPoints.map((p) => ({ x: p.x * factor, y: p.y * factor })),
      sectionPoints: sectionPoints.map((p) => ({ x: p.x * factor, y: p.y * factor })),
      namePoint: { x: point.x * factor, y: point.y * factor + 15 },
      rotation,
      name: section.name,
    };
  });

  return values;
};

/**
 *
 * @param ctx
 * @param watermarkImage
 * @param canvasWidth
 * @param canvasHeight
 */

const drawWatermark = (ctx, watermarkImage, canvasWidth, canvasHeight) => {
  const opacity = 1;
  const scale = 0.18; // 18% of canvas width for better visibility
  const margin = canvasWidth * 0.02; // 2% of canvas width — proportional margin

  const originalW = watermarkImage.width;
  const originalH = watermarkImage.height;

  const canvasW = canvasWidth;
  const canvasH = canvasHeight;

  // We want the watermark to occupy 18% of the image WIDTH
  const targetWidth = canvasW * scale;
  const aspectRatio = originalW / originalH;

  // Calculate the corresponding height
  const targetHeight = targetWidth / aspectRatio;

  // If for some reason it is taller than 18% of the height, adjust using height
  let finalW = targetWidth;
  let finalH = targetHeight;

  if (finalH > canvasH * scale) {
    // scale according to height
    finalH = canvasH * scale;
    finalW = finalH * aspectRatio;
  }

  // Calculate the position at bottom-left corner
  const x = margin;
  const y = canvasHeight - finalH - margin;

  // Save the current context
  ctx.save();

  // Apply transparency
  ctx.globalAlpha = opacity;

  // Draw the watermark
  ctx.drawImage(watermarkImage, 0, 0, watermarkImage.width, watermarkImage.height, x, y, finalW, finalH);

  // Restore the context
  ctx.restore();
};

const drawSection = (ctx, values, factor, imageHeight) => {
  const lineWidth = imageHeight * 0.004;

  values.forEach((section) => {
    const { dirPoints, sectionPoints, namePoint, rotation, name } = section;

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
    ctx.save();

    // Translate and rotate context to draw the text
    // If rotation can be undefined, use 0
    const rot = typeof rotation === 'number' ? rotation : 0;
    ctx.translate(namePoint.x, namePoint.y);
    ctx.rotate((rot * Math.PI) / 180);

    // Text style
    // Adjust font size based on factor
    const fontSize = imageHeight * 0.02; // 3% of image height
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = '#222';
    ctx.fontWeight = '500';

    // Draw text
    ctx.fillStyle = '#000000';
    ctx.fillText(name, 0, 0);

    ctx.restore();
  });
};

const drawQuiver = (
  ctx,
  quiver,
  frameIndex,
  transformationMatrix,
  factor,
  fps,
  step,
  imageWidth,
  colorbarLimits?: { min: number; max: number }
) => {
  // Get quiver data for the current frame
  const { data } = getQuiverValues(quiver, false, frameIndex, step, fps, transformationMatrix, {
    min: colorbarLimits.min,
    max: colorbarLimits.max,
  });

  // Used for avoid arrows going beyond the line end
  const delta = 0;

  // Set line width
  const lineWidth = imageWidth * 0.0012;
  const amplitudeFactor = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw each vector as an arrow
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const x1 = d.x * factor;
    const y1 = d.y * factor;
    const dx = d.u * amplitudeFactor * factor;
    const dy = d.v * amplitudeFactor * factor;
    const x2 = x1 + dx;
    const y2 = y1 + dy;

    // Line
    ctx.beginPath();
    ctx.lineWidth = lineWidth;
    ctx.moveTo(x1, y1);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const newLength = Math.hypot(x2 - x1, y2 - y1) - delta;

    // New end point to avoid overlapping with arrow head
    const newX2 = x1 + Math.cos(angle) * newLength;
    const newY2 = y1 + Math.sin(angle) * newLength;
    ctx.lineTo(newX2, newY2);
    ctx.strokeStyle = d.color;
    ctx.stroke();

    // Draw the arrow
    const arrowLength = lineWidth * 8;

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - arrowLength * Math.cos(angle - Math.PI / 7), y2 - arrowLength * Math.sin(angle - Math.PI / 7));
    ctx.lineTo(x2 - arrowLength * Math.cos(angle + Math.PI / 7), y2 - arrowLength * Math.sin(angle + Math.PI / 7));
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();
  }
};

/**
 * Draw a horizontal color bar legend with left/right labels
 * @param ctx | CanvasRenderingContext2D
 * @param min | minimum value
 * @param max | maximum value
 * @param canvasWidth | canvas width
 * @param canvasHeight | canvas height
 */
const drawColorBar = (ctx, min, max, canvasWidth, canvasHeight, unitSistem: string = 'si') => {
  // === Layout ===
  // Fully proportional sizing — no pixel caps — for harmonious proportions at any resolution
  const margin = canvasWidth * 0.02; // 2% of canvas width
  const containerWidth = canvasWidth * 0.38; // 38% of canvas width
  const containerHeight = canvasHeight * 0.08; // 8% of canvas height

  const x = canvasWidth - containerWidth - margin;
  const y = canvasHeight - containerHeight - margin;

  const radius = containerHeight * 0.5;
  const padding = containerHeight * 0.3;

  const colors = [
    '#6CD4FF', // light blue
    '#62C655', // green
    '#F5BF61', // yellow
    '#ED6B57', // red
  ];

  // === Container ===
  ctx.save();
  ctx.fillStyle = '#1e2525';

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + containerWidth - radius, y);
  ctx.quadraticCurveTo(x + containerWidth, y, x + containerWidth, y + radius);
  ctx.lineTo(x + containerWidth, y + containerHeight - radius);
  ctx.quadraticCurveTo(x + containerWidth, y + containerHeight, x + containerWidth - radius, y + containerHeight);
  ctx.lineTo(x + radius, y + containerHeight);
  ctx.quadraticCurveTo(x, y + containerHeight, x, y + containerHeight - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();

  // === Text ===
  const fontSize = containerHeight * 0.4;
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';

  const centerY = y + containerHeight / 2;

  const isImperial = unitSistem === 'imperial';
  const M_TO_FT = 3.28084;
  const unitLabel = isImperial ? 'ft/s' : 'm/s';
  const displayMin = isImperial ? min * M_TO_FT : min;
  const displayMax = isImperial ? max * M_TO_FT : max;
  const minText = `${displayMin.toFixed(2)} ${unitLabel}`;
  const maxText = `${displayMax.toFixed(2)} ${unitLabel}`;

  const minTextWidth = ctx.measureText(minText).width;
  const maxTextWidth = ctx.measureText(maxText).width;

  // Left label
  const minX = x + padding;
  ctx.fillText(minText, minX, centerY);

  // Right label
  const maxX = x + containerWidth - padding - maxTextWidth;
  ctx.fillText(maxText, maxX, centerY);

  // === Color bar ===
  const barHeight = containerHeight * 0.35;
  const barRadius = barHeight / 2;

  const barX = minX + minTextWidth + padding;
  const barWidth = maxX - barX - padding;
  const barY = y + (containerHeight - barHeight) / 2;

  const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);

  colors.forEach((color, i) => {
    gradient.addColorStop(i / (colors.length - 1), color);
  });

  ctx.fillStyle = gradient;

  ctx.beginPath();
  ctx.moveTo(barX + barRadius, barY);
  ctx.lineTo(barX + barWidth - barRadius, barY);
  ctx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + barRadius);
  ctx.lineTo(barX + barWidth, barY + barHeight - barRadius);
  ctx.quadraticCurveTo(barX + barWidth, barY + barHeight, barX + barWidth - barRadius, barY + barHeight);
  ctx.lineTo(barX + barRadius, barY + barHeight);
  ctx.quadraticCurveTo(barX, barY + barHeight, barX, barY + barHeight - barRadius);
  ctx.lineTo(barX, barY + barRadius);
  ctx.quadraticCurveTo(barX, barY, barX + barRadius, barY);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
};

export { getGifDimensions, loadSectionValues, drawWatermark, drawSection, drawQuiver, drawColorBar };
