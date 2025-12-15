import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ffmpeg = require('fluent-ffmpeg');
import { getFFMPEG } from "./getFFMPEG";
import * as fs from "fs/promises";
import fsSync from "fs";
import path from "path";

const { ffmpegPath, ffprobePath } = getFFMPEG();

if (ffmpegPath && ffprobePath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
}

function runFfmpegPromise(command: any): Promise<void> {
  return new Promise((resolve, reject) => {
    command
      .on("end", () => resolve())
      .on("error", (err: any, stdout: any, stderr: any) => {
        reject(new Error(String(err) + "\n" + String(stderr || stdout || "")));
      })
      .run();
  });
}

/**
 * Crea un GIF a partir de frames JPG cuyos nombres son números (p. ej. 0001.jpg, 0003.jpg).
 * Permite huecos en la numeración mientras los archivos estén ordenados por nombre.
 *
 * Estrategia:
 * - Lee todos los archivos *.jpg que tienen nombres únicamente numéricos.
 * - Ordena por el valor numérico.
 * - Construye un archivo temporal de tipo "concat" que indica la duración de cada frame (1/fps).
 * - Usa ese archivo como entrada para palettegen y luego para paletteuse para obtener colores correctos.
 */
async function createGif(folder: string, outputPath: string, fps: number) {
  console.log("Creating GIF at:", outputPath);
  console.log("Using frames from:", folder);
  console.log("Frames per second (fps):", fps);

  if (!folder || !outputPath) {
    throw new Error("folder and outputPath are required");
  }
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error("fps must be a positive number");
  }

  // Leer entradas y filtrar nombres que sean solo dígitos + .jpg
  const entries = await fs.readdir(folder);
  const jpgRegex = /^(\d+)\.jpg$/i;
  const matched = entries
    .map((name) => {
      const m = name.match(jpgRegex);
      if (!m) return null;
      return { name, num: parseInt(m[1], 10) };
    })
    .filter(Boolean) as { name: string; num: number }[];

  if (matched.length === 0) {
    throw new Error("No JPG files with numeric names found in folder: " + folder);
  }

  // Ordenar por valor numérico para mantener el orden aun con saltos
  matched.sort((a, b) => a.num - b.num);

  // Rutas absolutas de los frames en orden
  const framePaths = matched.map((m) => path.resolve(folder, m.name));

  // Asegurar que el directorio de salida exista
  const outDir = path.dirname(outputPath);
  if (!fsSync.existsSync(outDir)) {
    await fs.mkdir(outDir, { recursive: true });
  }

  // Archivos temporales
  const palettePath = path.join(outDir, ".tmp_palette.png");
  const listPath = path.join(outDir, ".tmp_frames_list.txt");

  // Construir contenido del archivo concat.
  // Formato:
  // file '/abs/path/to/frame1.jpg'
  // duration 0.1
  // ...
  const frameDuration = 1 / fps;
  let listContent = "";
  for (const p of framePaths) {
    const safePath = p.includes("'") ? p.replace(/'/g, "'\\''") : p;
    listContent += `file '${safePath}'\n`;
    listContent += `duration ${frameDuration}\n`;
  }
  // Repetir último archivo para que ffmpeg respete la duración del último frame
  const lastPath = framePaths[framePaths.length - 1];
  const safeLastPath = lastPath.includes("'") ? lastPath.replace(/'/g, "'\\''") : lastPath;
  listContent += `file '${safeLastPath}'\n`;

  try {
    // escribir el archivo temporal list.txt
    await fs.writeFile(listPath, listContent, "utf8");

    console.log(`Built concat list with ${framePaths.length} frames at ${listPath}`);
    console.log(`Generating palette at: ${palettePath}`);

    // 1) Generar paleta usando concat demuxer
    // ffmpeg -f concat -safe 0 -i list.txt -vf fps=FPS,palettegen palette.png
    const paletteCmd = ffmpeg()
      .input(listPath)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .videoFilters(`fps=${fps},palettegen`)
      .outputOptions(["-y"])
      .output(palettePath);

    await runFfmpegPromise(paletteCmd);

    console.log("Palette generated. Creating GIF using palette...");

    // 2) Crear GIF usando la paleta generada
    // ffmpeg -f concat -safe 0 -i list.txt -i palette.png -filter_complex "fps=FPS,paletteuse" -loop 0 out.gif
    const gifCmd = ffmpeg()
      .input(listPath)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .input(palettePath)
      .complexFilter([`fps=${fps},paletteuse`])
      .outputOptions(["-y", "-loop", "0"])
      .output(outputPath);

    await runFfmpegPromise(gifCmd);

    console.log("GIF created successfully at:", outputPath);
  } finally {
    // limpiar archivos temporales (ignorar errores)
    try {
      await fs.unlink(palettePath).catch(() => undefined);
    } catch {}
    try {
      await fs.unlink(listPath).catch(() => undefined);
    } catch {}
  }
}

export { createGif };