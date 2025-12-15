import os from 'os';
import { Worker } from 'worker_threads';
import { getGifDimensions, loadSectionValues } from '../utils/gif';
import { t } from 'i18next';


export default class WorkerPool {
    constructor(args ) {
        this.workerPath = './electron/ipcMainHandlers/workers/gifWorker.js';
        this.poolSize = os.cpus().length;
        this.workers = [];
        this.idleWorkers = [];
        this.taskQueue = [];
        this.activeTasks = new Map();
        this.dimensions = getGifDimensions(args.image.width, args.image.height, args.factor);
        this.sectionValues = loadSectionValues(args.sections, args.image.width, args.image.height, args.factor);
        this.args = args;

        for (let i = 0; i < this.poolSize; i++) {
            this.addWorker();
        }
    }

    addWorker() {
        const worker = new Worker(this.workerPath);
        worker.on('message', (msg) => {
            const { resolve } = this.activeTasks.get(msg.id);
            this.activeTasks.delete(msg.id);
            resolve(msg.result);
            this.checkQueue(worker);
        });
        worker.on('error', console.error);
        worker.on('exit', () => {
        this.workers = this.workers.filter(w => w !== worker);
        this.addWorker(); // Replace worker if it exits unexpectedly
        });
        this.workers.push(worker);
    }

    runTask(data) {
        return new Promise((resolve) => {
        const task = { 
            id: data.index, 
            file: data.file, 
            args: this.args,
            pass: data.pass,
            // preloaded data - the same for all tasks
            sectionValues: this.sectionValues, 
            dimensions: this.dimensions, 
        };
        this.taskQueue.push({ task, resolve });
        this.checkQueue();
        });
    }

    checkQueue(workerOverride) {
        if (this.taskQueue.length === 0) return;

        const idleWorker = workerOverride || this.workers.find(
        (worker) => ![...this.activeTasks.values()].some(w => w.worker === worker)
        );

        if (!idleWorker) return;

        const { task, resolve } = this.taskQueue.shift();
        this.activeTasks.set(task.id, { worker: idleWorker, resolve });
        idleWorker.postMessage(task);
    }

    destroy() {
        this.workers.forEach(worker => worker.terminate());
    }
}