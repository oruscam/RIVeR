import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from "fs";
import { transformData } from "./utils/transformCrossSectionsData";

async function getResultData(
  PROJECT_CONFIG: ProjectConfig,
  riverCli: Function,
) {
  ipcMain.handle("get-results-single", async (_event, args) => {
    console.log("get-results-single");
    const {
      step,
      fps,
      sectionIndex,
      alpha,
      num_stations,
      interpolated,
      activeCheck,
      name,
      showVelocityStd,
      showPercentile,
      artificialSeeding,
    } = args;

    console.log(activeCheck)

    const xSections = PROJECT_CONFIG.xsectionsPath;
    const transformationMatrix = PROJECT_CONFIG.matrixPath;
    const pivResults = PROJECT_CONFIG.resultsPath;
    const logsPath = PROJECT_CONFIG.logsPath;

    const xSectionsFile = await fs.promises.readFile(xSections, "latin1");
    const xSectionsFileParsed = JSON.parse(xSectionsFile);

    if (!arraysAreEqual(xSectionsFileParsed[name].check, activeCheck)) {
      xSectionsFileParsed[name].check = activeCheck;
      await fs.promises.writeFile(
        xSections,
        JSON.stringify(xSectionsFileParsed, null, 2),
        "latin1",
      );
    }

    const options = [
      "update-xsection",
      "--step",
      parseInt(step),
      "--fps",
      parseFloat(fps),
      "--id-section",
      sectionIndex,
      "--alpha",
      alpha,
      "--num-stations",
      num_stations,
      interpolated ? "--interpolate" : "",
      artificialSeeding ? "--artificial-seeding" : "",
      xSections,
      pivResults,
      transformationMatrix,
    ].filter((value) => value !== "");

    try {
      const { data, error } = (await riverCli(
        options,
        "text",
        false,
        logsPath,
      )) as any;

      if (error.message) {
        return {
          error,
        };
      }

      for (const sectionKey in data) {
        const section = data[sectionKey];
        xSectionsFileParsed[sectionKey] = section;
        xSectionsFileParsed[sectionKey].interpolated = interpolated;
        xSectionsFileParsed[sectionKey].showVelocityStd = showVelocityStd;
        xSectionsFileParsed[sectionKey].showPercentile = showPercentile;
        xSectionsFileParsed[sectionKey].artificial_seeding = artificialSeeding;
      }
      await fs.promises.writeFile(
        xSections,
        JSON.stringify(xSectionsFileParsed, null, 2),
        "latin1",
      );

      return {
        data: transformData(data, false),
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  });

  ipcMain.handle("get-results-all", async (_event, args) => {
    const xSections = PROJECT_CONFIG.xsectionsPath;
    const transformationMatrix = PROJECT_CONFIG.matrixPath;
    const pivResults = PROJECT_CONFIG.resultsPath;
    const logsPath = PROJECT_CONFIG.logsPath;

    const xSectionsFile = await fs.promises.readFile(xSections, "latin1");
    const xSectionsFileParsed = JSON.parse(xSectionsFile);

    for (const sectionKey in xSectionsFileParsed) {
      console.log("sectionKey", sectionKey);
      if (sectionKey === "summary") continue;
      if (xSectionsFileParsed[sectionKey].check) {
        xSectionsFileParsed[sectionKey].check = xSectionsFileParsed[
          sectionKey
        ].check.map(() => true);
      }
    }

    await fs.promises.writeFile(
      xSections,
      JSON.stringify(xSectionsFileParsed, null, 2),
      "latin1",
    );

    let updatedSections = {};

    const { step, fps, numSections } = args;

    let finalData = null;
    let finalError = null;

    for (let i = 0; i < numSections; i++) {
      const options = [
        "update-xsection",
        "--step",
        parseInt(step),
        "--fps",
        parseFloat(fps),
        "--id-section",
        i,
        "--interpolate",
        xSections,
        pivResults,
        transformationMatrix,
      ];

      try {
        const { data, error } = (await riverCli(
          options,
          "text",
          false,
          logsPath,
        )) as any;

        for (const sectionKey in data) {
          const sectionIndex = Object.keys(data).indexOf(sectionKey);
          if (sectionIndex === i) {
            const section = data[sectionKey];
            updatedSections[sectionKey] = section;
            xSectionsFileParsed[sectionKey] = section;
            xSectionsFileParsed[sectionKey].interpolated = true;
            xSectionsFileParsed[sectionKey].artificial_seeding = false;
            xSectionsFileParsed[sectionKey].showVelocityStd = true;
            xSectionsFileParsed[sectionKey].showPercentile = true;
            xSectionsFileParsed.summary = data.summary;
          }
        }
        await fs.promises.writeFile(
          xSections,
          JSON.stringify(xSectionsFileParsed, null, 2),
          "latin1",
        );
        finalData = transformData(xSectionsFileParsed, true);
        finalError = error;
      } catch (error) {
        console.log(error);
        throw error;
      }
    }
    console.log(finalError);

    return {
      data: finalData,
      error: finalError,
    };
  });
}

function arraysAreEqual(arr1: boolean[], arr2: boolean[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

export { getResultData };
