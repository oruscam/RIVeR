import { useTranslation } from 'react-i18next';
import { ProgressReadout } from '../../ProgressReadout';
import { AnalyzeRunState, readoutFoot } from '../../../helpers/analyzeRunState';

/** The run's readout. State comes from useAnalyzeStage in FormProcessing, which the technique rows share. */
export const AnalyzingProgress = ({ state }: { state: AnalyzeRunState }) => {
  const { t } = useTranslation();
  const { label, time } = readoutFoot(state, t);
  return <ProgressReadout percentage={state.percentage} label={label} time={time} />;
};
