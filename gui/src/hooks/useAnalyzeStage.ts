import { useEffect, useState } from 'react';
import { parseAnalyzeStage } from '../helpers/parseAnalyzeStage';
import { AnalyzeRunState, initialAnalyzeRunState, reduceAnalyzeStage } from '../helpers/analyzeRunState';

/**
 * Follows the backend's progress lines for one Analyze run. Resets each time
 * `running` turns true, so a second run never opens on the first run's
 * numbers (the old resetProgress flag was set to true once and never back).
 */
export const useAnalyzeStage = (running: boolean): AnalyzeRunState => {
  const [state, setState] = useState<AnalyzeRunState>(initialAnalyzeRunState);

  useEffect(() => {
    if (running) setState(initialAnalyzeRunState());
  }, [running]);

  useEffect(() => {
    const handle = (_event: unknown, text: string) => {
      setState((prev) => reduceAnalyzeStage(prev, parseAnalyzeStage(text)));
    };
    window.ipcRenderer.on('river-cli-message', handle);
    return () => {
      window.ipcRenderer.removeListener('river-cli-message', handle);
    };
  }, []);

  return state;
};
