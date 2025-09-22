// Common extensions for spreadsheet files
// Used in file dialogs and to validate dropped files

const EXTENSIONS = ['csv', 'tsv', 'xlsx', 'xls', 'xlsm', 'ods', 'fods', 'prn', 'dif', 'sylk'];

// Validate if the file has a valid extension
// It used when the user drops a file, to check if the extension is valid
function validateFile(filePath: string, allowedExtensions?: string[]): boolean {
  let isValid = false;

  if (filePath === undefined) {
    return isValid;
  }

  if (allowedExtensions === undefined) {
    allowedExtensions = EXTENSIONS;
  }

  for (const ext of allowedExtensions) {
    if (filePath.endsWith(ext)) {
      isValid = true;
      break;
    }
  }

  return isValid;
}

export { validateFile, EXTENSIONS };
