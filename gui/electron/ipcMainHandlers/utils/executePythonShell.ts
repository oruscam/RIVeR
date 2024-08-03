import { PythonShell } from "python-shell";

async function executePythonShell(args: (string | number)[]){
    const options = {
        pythonPath: '/home/tomy_ste/Desktop/RIVeR/RIVeR/venv/bin/python3',
        scriptPath: '/home/tomy_ste/Desktop/RIVeR/RIVeR/river/cli/',
        args: args
    }
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