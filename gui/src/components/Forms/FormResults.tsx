import { useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useDataSlice, useProjectSlice, useSectionSlice, useUiSlice } from '../../hooks';
import { AllInOne } from '../Graphs/AllInOne';
import { TechniqueLegend } from '../Graphs/TechniqueLegend';
import { Grid } from '../index';
import { useTranslation } from 'react-i18next';
import { LuChevronDown, LuSpline, LuWand2 } from 'react-icons/lu';
import { UNIT_CONVERSIONS, UNITS } from '../../constants/constants';
import { getEffectiveTechniqueData } from '../../helpers';

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

  const [alphaOpen, setAlphaOpen] = useState(false);
  const alphaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (alphaRef.current && !alphaRef.current.contains(e.target as Node)) {
        setAlphaOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isImperial = projectDetails.unitSistem === 'imperial';
  const flowUnit = isImperial ? UNITS.IMPERIAL.FLOW : UNITS.SI.FLOW;

  const effective = data
    ? getEffectiveTechniqueData(data, activeTechnique, { interpolated, artificialSeeding, alpha })
    : null;
  const displayQ =
    effective?.total_Q != null
      ? isImperial
        ? (effective.total_Q * UNIT_CONVERSIONS.M3_TO_FT3).toFixed(3)
        : effective.total_Q.toFixed(3)
      : null;

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = e.target.id;
    if (id === 'artificial-seeding') {
      onUpdateSection({ artificialSeeding: 'artificial-seeding' }, undefined);
    }
  };

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
          onUpdateSection({ alpha: value }, undefined);
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

        <span className="divider-line mt-2 mb-1" />

        {/* ZONE B — COMPUTATION */}
        <h3 className="zone-title">{t('Results.computation')}</h3>
        <div
          className="switch-container-results"
          style={{
            width: 'auto',
            margin: '0 auto',
            cursor: hasGaps ? 'pointer' : 'not-allowed',
            gap: '8px',
            opacity: hasGaps ? 1 : 0.4,
          }}
          onClick={hasGaps ? handleInterpolateToggle : undefined}
          title={hasGaps ? '' : t('Results.interpolateProfileDisabled', { technique: activeTechniqueLabel })}
        >
          <LuSpline size={15} color={interpolated ? 'var(--accent-color)' : 'var(--secondary-text-color)'} />
          <span
            style={{
              fontSize: '13px',
              color: interpolated ? 'var(--accent-color)' : 'var(--secondary-text-color)',
              whiteSpace: 'nowrap',
            }}
          >
            {t('Results.interpolateProfile')}
          </span>
          <label className="switch" style={{ marginLeft: '6px' }} onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={interpolated}
              onChange={hasGaps ? handleInterpolateToggle : undefined}
              disabled={!hasGaps}
            />
            <span className="slider"></span>
          </label>
        </div>

        <details className="disclosure mt-1">
          <summary>
            <LuChevronDown className="chev" size={13} />
            {t('Results.computationSettings')}
          </summary>
          <div className="disclosure-body">
            <div className="input-container-2">
              <label className="read-only me-1" htmlFor="alpha">
                {t('Results.alpha')}
              </label>
              <div className="alpha-wrap" ref={alphaRef}>
                <button type="button" className="alpha-chip" onClick={() => setAlphaOpen((v) => !v)}>
                  α {alpha.toFixed(2)}
                </button>
                <div className={`alpha-popover${alphaOpen ? ' open' : ''}`}>
                  <div className="input-field-container">
                    <input
                      className="input-field-little"
                      id="alpha"
                      type="number"
                      step="any"
                      {...register(`${name}_ALPHA`)}
                      onKeyDown={handleOnChangeInput}
                      onBlur={handleOnChangeInput}
                    ></input>
                  </div>
                  <p className="alpha-help">{t('Results.alphaHelp')}</p>
                </div>
              </div>
            </div>

            <div className="switch-container-results mt-1">
              <h3 className="field-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LuWand2 size={15} />
                {t('Processing.artificialSeeding')}
              </h3>
              <label className="switch">
                <input
                  type="checkbox"
                  {...register(`${name}_ARTIFICIAL_SEEDING`)}
                  id="artificial-seeding"
                  onChange={handleOnChange}
                  defaultChecked={artificialSeeding}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </details>

        <span className="divider-line mt-2 mb-1" />

        {/* ZONE C — DISPLAY */}
        <h3 className="zone-title">{t('Results.display')}</h3>
        <TechniqueLegend />

        <div className="mt-1 all-in-one-container" style={{ width: '100%', height: '720px' }}>
          <AllInOne isReport={false} height={700} />
        </div>

        <span className="divider-line mt-2 mb-1" />

        {/* ZONE D — DATA */}
        <h3 className="zone-title">{t('Results.data')}</h3>
        <Grid></Grid>
      </form>
    </div>
  );
};
