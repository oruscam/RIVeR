import { app, ipcMain, webContents } from "electron";
import { ChildProcess, spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";

let python: ChildProcess;
const DEV_SERVER = process.env.VITE_DEV_SERVER_URL;

async function executeRiverCli(
  options: (string | number)[],
  _mode: "json" | "text" = "json",
  output: boolean = false,
  logFile: string,
): Promise<{ data: any; error: any }> {
  let riverCliPath: string;
  if (DEV_SERVER) {
    riverCliPath = path.join(app.getAppPath(), "river-cli", "river-cli");
  } else {
    riverCliPath = path.join(app.getAppPath(), "..", "river-cli", "river-cli");
  }

  const args = options.map((arg) => arg.toString());

  console.log("you are using river-cli", riverCliPath);
  console.log(options);

  const result = await new Promise((resolve, reject) => {
    python = spawn(riverCliPath, args);

    let stdoutData = "";
    let stderrData = "";

    python.stdout.on("data", (data) => {
      const message = data.toString();

      if (output) {
        // This is because, when cli has user processing errors, like
        // windows-size. Launches Processing message... and object {data, error}
        //  stdout identifies two messages like one
        //  We need to split the message and get the last one.

        const messages = message.split("\n").filter((msg) => msg.trim() !== "");
        stdoutData = messages[messages.length - 1];
      } else {
        stdoutData += message;
      }
    });

    python.stderr.on("data", (data) => {
      const message = data.toString();
      stderrData = message;
      console.log("stderr", message);
      // Output
      if (output === true) {
        webContents.getAllWebContents().forEach((contents) => {
          contents.send("river-cli-message", message);
        });
      }
    });

    python.on("close", async(code) => {
      if (code !== 0) {
        if (code === null) {
          resolve({
            error: {
              message: "Process was killed",
            },
          });
          return;
        }
      } else {
        console.log("river-cli process finished");
        resolve(JSON.parse(stdoutData.replace(/\bNaN\b/g, "null")));
        await killRiverCli();
      }

      // Append log to log-file
      appendLog(logFile, args, stdoutData, stderrData);
    });

    python.on("error", (error) => {
      console.log(`error river-cli: ${error.message}`);
      reject(error);
    });
  });

  return result as { data: any; error: any };
}

async function killRiverCli() {
  if (python) {
    python.kill();
    console.log("Process killed successfully");
    return true;
  }
  return false;
}

ipcMain.handle("kill-river-cli", async () => {
  console.log("kill-river-cli");
  return killRiverCli();
});

app.on("before-quit", async (event) => {
  if (python) {
    console.log("App is quitting. Killing river-cli process");
    await killRiverCli();
  }
  app.exit(); // Ensure the app exits after handling the process
});

/**
 * Appends a log entry to the specified file.
 *
 * @param path - The file path where the log should be appended.
 * @param args - The arguments passed to the CLI command.
 * @param data - The data output from the CLI command.
 * @param error - The error message, if any, from the CLI command. Defaults to an empty string.
 *
 * The function processes the CLI command output and appends a formatted log entry to the specified file.
 * It handles specific CLI commands ('create-mask-and-bbox', 'piv-test', 'update-xsection') and formats the log output accordingly.
 * If the command is 'update-xsection', it replaces occurrences of 'NaN' with 'null' in the data before processing.
 * The log entry includes the CLI command options, the processed output, and any error message.
 */

function appendLog(
  path: string,
  args: string[],
  data: string,
  error: string = "",
) {
  let output = "";

  if (args[0] === "create-mask-and-bbox" && error === "") {
    const parsedData = JSON.parse(data);
    if (parsedData.error && Object.keys(parsedData.error).length !== 0) {
      output = parsedData.error;
    } else {
      output = "Mask and Bbox created successfully";
    }
  }

  if (args[0] === "piv-test" && error === "") {
    const parsedData = JSON.parse(data.replace(/\bNaN\b/g, "null"));
    if (parsedData.error && Object.keys(parsedData.error).length !== 0) {
      output = parsedData.error;
    } else {
      output = "piv-test finished successfully";
    }
  }

  if (args[0] === "update-xsection" && error === "") {
    const parsedData = JSON.parse(data.replace(/\bNaN\b/g, "null"));
    if (parsedData.error && Object.keys(parsedData.error).length !== 0) {
      output = parsedData.error;
    } else {
      output = "x-sections updated successfully";
    }
  }

  const log = {
    options: args,
    output: output !== "" ? output : data,
    error: error,
  };

  let parsedLog = JSON.stringify(log, null, 4);
  parsedLog = parsedLog + "\n";

  fs.promises.appendFile(path, parsedLog, "utf-8");
}

export { executeRiverCli, killRiverCli };
