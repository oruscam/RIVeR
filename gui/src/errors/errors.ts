export class OperationCanceledError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OperationCanceledError';
        this.stack = ''
    }
}

export class UserSelectionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UserSelectionError';
        this.stack = ''
    }
}