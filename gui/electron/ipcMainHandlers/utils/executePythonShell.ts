/**
 * @file executePythonShell.ts
 * This file is used to execute the python shell with the given arguments.
 * It uses the PythonShell library to execute the python script.
 */

import { PythonShell } from "python-shell";

/**
 * Function to execute the python shell with the given arguments.
 * @param args - Array with the arguments to pass to the python script
 * @returns - Promise with the result of the python script
 */

async function executePythonShell(args: (string | number)[]){
    
    /**
     * Options to execute the python shell.
     * pythonPath: Path to the python executable
     * scriptPath: Path to the python script
     * args: Arguments to pass to the python script
     */

    const options = {
        pythonPath: '/home/tomy_ste/Desktop/RIVeR/RIVeR/venv/bin/python3',
        scriptPath: '/home/tomy_ste/Desktop/RIVeR/RIVeR/river/cli/',
        args: args
    }

    /**
     * Python shell to execute the python script.
     * It will return a promise with the result of the python script.
     * The result is parsed from a string to a JSON object.
     * If an error occurs, it will be logged.
     */


    const pyshell = new PythonShell('__main__.py', options);
    

    return new Promise((resolve, reject) => {
        pyshell.on('message', (message: string) => {
            const messageParsed = JSON.parse(message);
            resolve(messageParsed);
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

export { executePythonShell }