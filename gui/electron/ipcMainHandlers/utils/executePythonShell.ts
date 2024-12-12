    /**
 * @file executePythonShell.ts
 * This file is used to execute the python shell with the given arguments.
 * It uses the PythonShell library to execute the python script.
 */

import { exec } from "child_process";
import { app, ipcMain, webContents } from "electron";
import { Options, PythonShell } from "python-shell";


/**
 * Function to execute the python shell with the given arguments.
 * @param args - Array with the arguments to pass to the python script
 * @returns - Promise with the result of the python script
 */

let currentPyShell: PythonShell | null = null;
const PYTHON_PATH = import.meta.env.VITE_PYTHON_PATH;
const RIVER_CLI_PATH = import.meta.env.VITE_RIVER_CLI_PATH;

async function executePythonShell(args: (string | number)[], mode: ('json' | 'text') = 'json', output: boolean = false) {
    
    /**
     * Options to execute the python shell.
     * pythonPath: Path to the python executable
     * scriptPath: Path to the python script
     * args: Arguments to pass to the python script
     */
    let options: Options 

    if ( mode === 'json' ) {
        options = {
            mode: 'json',
            pythonPath: PYTHON_PATH,
            scriptPath: RIVER_CLI_PATH,
            args: args.map(arg => arg.toString())
        }
    } else {
        options = {
            mode: 'text',
            pythonPath: PYTHON_PATH,
            scriptPath: RIVER_CLI_PATH,
            args: args.map(arg => arg.toString())
        }
    }

    console.log('execute-python-shell')
    console.log(options)
    console.time('river-cli-time')

    /**
     * Python shell to execute the python script.
     * It will return a promise with the result of the python script.
     * The result is parsed from a string to a JSON object.
     * If an error occurs, it will be logged.
     */

    const pyshell = new PythonShell('__main__.py', options);
    currentPyShell = pyshell;
    
    return new Promise((resolve, reject) => {
        pyshell.on('message', (message: string) => {
            if ( mode === 'text'){
                console.log(message)
                try {
                    resolve(JSON.parse(message.replace(/\bNaN\b/g, "null")));
                } catch (error) {
                    console.log("not json")
                }
            } else {
                console.log(message)
                resolve(message);
            }
        });

        pyshell.stderr.on('data', (data: string) => {
            console.log(data);
            // Enviar datos al proceso de renderizado
            webContents.getAllWebContents().forEach((contents) => {
                contents.send('river-cli-message', data);
            });
        });

        pyshell.end((err: Error) => {
            if (err) {
                console.log("pyshell error");
                console.log(err);
                reject(err);
            }
        });
    })
}

async function killPythonShell(){
    if ( currentPyShell ){
        try {
            // Attempt to kill the process using PythonShell's kill method
            currentPyShell.kill();
            // Force kill the process if it still exists
            exec(`pkill -f __main__.py`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error killing process: ${error}`);
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                }
                console.log(`stdout: ${stdout}`);
            });

            currentPyShell = null;
            return { message: "Python shell canceled" };
        } catch (error) {
            console.error(`Error killing Python shell: ${error}`);
            return { message: "Error canceling Python shell" };
        }
    } else {
        return { message: "No python shell to cancel" };
    }
}

ipcMain.handle('kill-python-shell', async () => {
    return await killPythonShell();
});

app.on('before-quit', async (event) => {
    event.preventDefault(); // Prevenir el cierre inmediato de la aplicación
    console.log('App is quitting. Killing river-cli process');
    await killPythonShell();
});

export { executePythonShell, killPythonShell }
