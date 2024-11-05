import { app, ipcMain } from 'electron';
import { ChildProcess, execFile } from 'child_process'
import * as path from 'path';
import kill from 'tree-kill';

let python: ChildProcess 

async function executeRiverCli( options: (string|number)[], _mode: ('json' | 'text') = 'json'): Promise<{ data: any, error: any }> {
    const riverCliPath = path.join(app.getAppPath(), '..', 'river-cli')
    const args = options.map(arg => arg.toString())

    const result = await new Promise((resolve, reject) => {
        python = execFile(riverCliPath, args, {maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                console.log(`error asdasdasd: ${error.message}`);
                if(error.signal === 'SIGKILL'){
                    return
                }
                reject(error);
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                reject(stderr);
            }
            resolve(JSON.parse(stdout.replace(/\bNaN\b/g, "null"), null));
        });
    })

    return result as { data: any, error: any };
}

ipcMain.handle('kill-river-cli', async () => {
    console.log('kill-river-cli')
    if (python) {
        kill(python.pid, 'SIGKILL', (err) => {
            if (err) {
                console.log(err)
                return false
            }
        })
    }
    return true
    
})

export { executeRiverCli }

// "python-shell": "^5.0.0",