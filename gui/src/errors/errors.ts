export class OperationCanceledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperationCanceledError";
    this.stack = "";
  }
}

export class UserSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserSelectionError";
    this.stack = "";
  }
}

export class CliError extends Error {
  constructor(message: string, t: any) {
    const trimmedMessage = message.trim().replace(":", ""); // Eliminar espacios adicionales
    const translationKey = "Errors.Cli." + trimmedMessage;
    const newMessage = t(translationKey, {
      defaultValue: t("Commons.randomError"),
    });
    super(newMessage);
    this.name = "CliError";
    this.stack = "";
  }
}

export class ResourceBusyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResourceBusyError";
    this.stack = "";
  }
}

export class ResourceNotFoundError extends Error {
  constructor(message: string, t: any) {
    const newMessage = t("Errors." + message, {
      defaultValue: t("Commons.resourceNotFound"),
    });
    super(newMessage);
    this.name = "ResourceNotFoundError";
    this.stack = "";
  }
}
