import * as fs from "fs";

export async function readResultsPiv(path: string) {
  try {
    const data = await fs.promises.readFile(path, "utf-8");
    const { x, y, u, v, v_median, u_median } = JSON.parse(
      data.replace(/\bNaN\b/g, "null"),
    );

    return {
      x,
      y,
      u,
      v,
      u_median,
      v_median,
    };
  } catch (error) {
    throw error;
  }
}
