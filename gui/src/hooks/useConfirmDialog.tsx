import { useCallback, useRef, useState } from 'react';
import { Dialog, DialogOptions } from '../components/Messages/Dialog';

/**
 * Promise-based replacement for the native `window.ipcRenderer.invoke('delete-confirmation', …)`
 * confirm (Task 13's only consumer). Mount the returned element once per
 * screen (same place `<StepAlertList/>` goes); call `confirm(...)` from any
 * click handler and `await` the boolean instead of `await window.ipcRenderer.invoke(...)`.
 */
export const useConfirmDialog = (): [React.ReactNode, (opts: DialogOptions) => Promise<boolean>] => {
  const [options, setOptions] = useState<DialogOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: DialogOptions): Promise<boolean> => {
    setOptions(opts);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  const element =
    options === null ? null : (
      <Dialog options={options} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
    );

  return [element, confirm];
};
