
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

export class ResourceNotFoundError extends Error {
    constructor(message: string, t: any) {
        const newMessage = t('Errors.' + message, { defaultValue: 'Resource not found' });
        super(newMessage);
        this.name = 'ResourceNotFoundError';
        this.stack = ''
    }
}