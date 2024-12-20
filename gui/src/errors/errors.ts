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

export class CliError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CliError';
        this.stack = ''
    }
}

export class ResourceBusyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ResourceBusyError';
        this.stack = ''
    }
}