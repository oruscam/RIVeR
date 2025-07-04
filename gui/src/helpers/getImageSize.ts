/**
 * Function to get the size of an image.
 * @param src - The source URL of the image.
 * @returns A promise that resolves to an object containing the width and height of the image.
 */

export const getImageSize = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    console.log("img.src:", src);
    console.log("img:", img);
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = src;
  });
}

