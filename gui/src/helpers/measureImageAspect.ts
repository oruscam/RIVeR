/**
 * Width / height of an image, for sizing a placeholder like its neighbours.
 * Resolves null (never rejects) when there is no source, the load fails or the
 * image has no height.
 */
export const measureImageAspect = (src: string): Promise<number | null> => {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : null);
    img.onerror = () => resolve(null);
    img.src = src;
  });
};
