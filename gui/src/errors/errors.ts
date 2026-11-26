export class OperationCanceledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OperationCanceledError';
    this.stack = '';
  }
}

export class UserSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserSelectionError';
    this.stack = '';
  }
}

export class CliError extends Error {
  constructor(message: string, t: any) {
    const trimmedMessage = message.trim().replace(':', ''); // Eliminar espacios adicionales
    const translationKey = 'Errors.Cli.' + trimmedMessage;
    const newMessage = t(translationKey, {
      defaultValue: t('Commons.randomError'),
    });
    super(newMessage);
    this.name = 'CliError';
    this.stack = '';
  }
}

const MAX_REASON_LENGTH = 200;

/** A failed PIV run: a known cause keeps its translation, any other one shows what the backend said. */
export class AnalysisError extends Error {
  constructor(message: string, t: any) {
    // A process that crashes sends its whole output; the cause is on the last line.
    const lines = message.split(/[\r\n]+/).filter((line) => line.trim() !== '');
    const reason = (lines[lines.length - 1] ?? '')
      .trim()
      .replace(/^Unexpected error:\s*/, '')
      .replace(/\.$/, '')
      .slice(0, MAX_REASON_LENGTH);
    const knownCause = t('Errors.Cli.' + message.trim().replace(':', ''), { defaultValue: '' });
    super(knownCause || t('Processing.analysisFailed', { error: reason }));
    this.name = 'AnalysisError';
    this.stack = '';
  }
}

export class CliErrorMessage extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'CliErrorMessage';
    this.stack = '';
  }
}

export class ResourceBusyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceBusyError';
    this.stack = '';
  }
}

export class ResourceNotFoundError extends Error {
  constructor(message: string, t: any) {
    const newMessage = t('Errors.' + message, {
      defaultValue: t('Commons.resourceNotFound'),
    });
    super(newMessage);
    this.name = 'ResourceNotFoundError';
    this.stack = '';
  }
}
