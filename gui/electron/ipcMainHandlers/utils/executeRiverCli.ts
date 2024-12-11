import { app, ipcMain, webContents } from 'electron';
import { ChildProcess, execFile, spawn } from 'child_process'
import * as path from 'path';
import kill from 'tree-kill';

let python: ChildProcess 

async function executeRiverCli(options: (string | number)[], _mode: ('json' | 'text') = 'json', output: boolean = false): Promise<{ data: any, error: any }> {
    const riverCliPath = path.join(app.getAppPath(), '..', 'river-cli');
    const args = options.map(arg => arg.toString());

    console.log('you are using river-cli', riverCliPath);
    console.log(options)

    const result = await new Promise((resolve, reject) => {
        python = spawn(riverCliPath, args);

        let stdoutData = '';
        let stderrData = '';

        python.stdout.on('data', (data) => {
            const message = data.toString();
            if ( output ){
                stdoutData = message
            } else {
                stdoutData += message;
            }
        });

        python.stderr.on('data', (data) => {
            const message = data.toString();
            console.log('std-error: ')
            console.log(message);
            // Output
            if ( output === true){
                webContents.getAllWebContents().forEach((contents) => {
                    contents.send('river-cli-message', message);
                });
            }
        });

        python.on('close', (code) => {
            if (code !== 0) {
                if ( code === null){
                    resolve({ error: {
                        message: 'Process was killed'
                    }});
                }
            } else {
                console.log('river-cli process finished');
                console.log(stdoutData);
                resolve(JSON.parse(stdoutData.replace(/\bNaN\b/g, "null")));
            }
        });

        python.on('error', (error) => {
            console.log(`error river-cli: ${error.message}`);
            reject(error);
        });

    });

    return result as { data: any, error: any };
}

function killProcess(pid: number): Promise<void> {
    return new Promise((resolve, reject) => {
        kill(pid, 'SIGKILL', (err) => {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                console.log('sigkill');
                resolve();
            }
        });
    });
}

async function killRiverCli() {
    if (python) {
        try {
            await killProcess(python.pid);
            console.log('Process killed successfully');
        } catch (err) {
            console.log('Failed to kill process', err);
        }
    }
    return true;
}

ipcMain.handle('kill-river-cli', async () => {
    console.log('kill-river-cli');
    return await killRiverCli();
});

app.on('before-quit', async (event) => {
    event.preventDefault(); // Prevenir el cierre inmediato de la aplicación
    console.log('App is quitting. Killing river-cli process');
    await killRiverCli();
});

export { executeRiverCli, killRiverCli }
