type Translate = (key: string, values?: Record<string, unknown>) => string;

/**
 * The message shown when importing a frames folder fails. The backend reports a code
 * (river/core/frames_to_frames.py), with the file name after a colon when one file is at fault;
 * anything else is already a sentence and passes through.
 */
export function framesImportError(message: string, t: Translate): string {
  const separator = message.indexOf(':');
  const code = separator === -1 ? message : message.slice(0, separator);
  const file = separator === -1 ? '' : message.slice(separator + 1);

  if (code === 'unreadable' && file) return t('VideoRange.Errors.frameUnreadable', { file });
  if (code === 'mixedSizes' && file) return t('VideoRange.Errors.frameSizeDiffers', { file });
  if (message === 'emptySelection') return t('VideoRange.Errors.noFramesSelected');
  if (message === 'noFrames' || message === 'mixedSizes') return t(`Step-2.Errors.${message}`);
  return message;
}
