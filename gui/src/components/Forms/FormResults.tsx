import { useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useDataSlice, useProjectSlice, useSectionSlice, useUiSlice } from '../../hooks';
import { AllInOne } from '../Graphs/AllInOne';
import { TechniqueLegend } from '../Graphs/TechniqueLegend';
import { Grid } from '../index';
import { useTranslation } from 'react-i18next';
import { LuSpline } from 'react-icons/lu';
import { UNIT_CONVERSIONS, UNITS } from '../../constants/constants';
import { getEffectiveTechniqueData } from '../../helpers';
import '../CustomIcons/piv-icons.css';

interface FormResultProps {
  onSubmit: (data: React.SyntheticEvent<HTMLFormElement, Event>) => void;
  index: number;
}

export const FormResults = ({ onSubmit, index }: FormResultProps) => {
  const { register, setValue } = useFormContext();
  const { sections, activeSection, onUpdateSection } = useSectionSlice();
  const { name, data, alpha, artificialSeeding, activeTechnique, interpolated } = sections[activeSection];
  const { isBackendWorking } = useDataSlice();
  const { projectDetails } = useProjectSlice();

  const { t } = useTranslation();

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isImperial = projectDetails.unitSistem === 'imperial';
  const flowUnit = isImperial ? UNITS.IMPERIAL.FLOW : UNITS.SI.FLOW;

  const effective = data
    ? getEffectiveTechniqueData(data, activeTechnique, { interpolated, artificialSeeding, alpha })
    : null;
  const displayQ =
    effective?.total_Q != null
      ? isImperial
        ? (effective.total_Q * UNIT_CONVERSIONS.M3_TO_FT3).toFixed(2)
        : effective.total_Q.toFixed(2)
      : null;

  const handleOnChangeInput = (
    event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>
  ) => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key === 'Enter' || event.type === 'blur') {
      event.preventDefault();
      const value = parseFloat((event.target as HTMLInputElement).value);
      const id = (event.target as HTMLInputElement).id;
      switch (id) {
        case 'alpha':
          if (value !== 0 && value !== alpha && isNaN(value) === false) {
            onUpdateSection({ alpha: value }, undefined);
          } else {
            setValue(`${name}_ALPHA`, alpha);
          }
          break;

        default:
          break;
      }
    }
  };

  const handleInterpolateToggle = () => {
    onUpdateSection({ interpolated: 'interpolated' }, undefined);
  };

  const activeTechniqueLabel =
    activeTechnique === 'lspiv' ? 'LSPIV' : activeTechnique === 'stiv' ? 'STIV' : 'iWave';
  const hasGaps = effective?.hasGaps ?? false;

  return (
    <div id="form-section-div" className={activeSection !== index ? 'hidden' : 'wrapper'}>
      <form className={`${isBackendWorking ? 'disabled' : ''}`} onSubmit={onSubmit} id="form-result">
        {/* ZONE A — RESULT */}
        <div id="result-info">
          <button
            type="button"
            className={hasGaps ? `ib${interpolated ? ' active' : ''}` : 'ib ib-off'}
            title={
              hasGaps
                ? t('Results.interpolateProfile')
                : t('Results.interpolateProfileDisabled', { technique: activeTechniqueLabel })
            }
            aria-label={
              hasGaps
                ? t('Results.interpolateProfile')
                : t('Results.interpolateProfileDisabled', { technique: activeTechniqueLabel })
            }
            onClick={hasGaps ? handleInterpolateToggle : undefined}
          >
            <LuSpline size={20} />
          </button>
          <div className="result-value-row">
            <p id="result-number">
              {displayQ} <span style={{ fontSize: '0.45em', opacity: 0.7 }}>{flowUnit}</span>
            </p>
            <div>
              <p id="result-measured">
                {' '}
                {((effective?.measured_Q ?? 0) * 100).toFixed(1)}% {t('Results.measured')}
              </p>
              <p>
                {' '}
                {((effective?.interpolated_Q ?? 0) * 100).toFixed(1)}% {t('Results.interpolated')}{' '}
              </p>
            </div>
          </div>
        </div>

        <span className="divider-line mt-2 mb-1" />

        {/* ZONE B — COMPUTATION */}
        <div className="pill-row">
          <label className="pill-alpha-label" htmlFor="alpha">
            α
          </label>
          <input
            className="input-field-little"
            id="alpha"
            type="number"
            step="any"
            {...register(`${name}_ALPHA`)}
            onKeyDown={handleOnChangeInput}
            onBlur={handleOnChangeInput}
          />
        </div>

        <span className="divider-line mt-2 mb-1" />

        {/* ZONE C — DISPLAY */}
        <TechniqueLegend />

        <div className="mt-1 all-in-one-container" ref={chartContainerRef} style={{ height: '720px' }}>
          <AllInOne isReport={false} height={700} width={chartWidth} />
        </div>

        <span className="divider-line mt-2 mb-1" />

        {/* ZONE D — DATA */}
        <h3 className="zone-title">{t('Results.data')}</h3>
        <Grid></Grid>
      </form>
    </div>
  );
};
