import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuChevronRight, LuEye, LuEyeOff } from 'react-icons/lu';
import { useProjectSlice, useSectionSlice } from '../../hooks';
import { getEffectiveTechniqueData } from '../../helpers';
import { UNIT_CONVERSIONS, UNITS } from '../../constants/constants';
import { Technique } from '../../store/section/types';
import { TechniqueRow } from '../TechniqueRow';
import './graphs.css';

const TECHNIQUES: { key: Technique; label: string }[] = [
  { key: 'lspiv', label: 'LSPIV' },
  { key: 'stiv', label: 'STIV' },
  { key: 'iwave', label: 'iWave' },
];

const visibilityField = (key: Technique): 'showLspiv' | 'showStiv' | 'showIwave' =>
  key === 'lspiv' ? 'showLspiv' : key === 'stiv' ? 'showStiv' : 'showIwave';

/**
 * One row per technique: click the name to make it active (drives VS/Q/interpolation/alpha
 * — goal 1); the eye icon toggles chart visibility independently (goal 2); the trailing
 * total is that technique's own discharge, always visible; the disclosure chevron expands
 * a written-label body (artificial seeding / uncertainty band / quality shading — goal 4),
 * replacing the old cramped single-letter glyphs. Each row's expanded state is independent
 * so two techniques' layer controls can be compared open at once.
 */
export const TechniqueLegend = () => {
  const { sections, activeSection, onSetActiveTechnique, onChangeDataValues, onUpdateSection } = useSectionSlice();
  const { video, projectDetails } = useProjectSlice();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Record<Technique, boolean>>({
    lspiv: false,
    stiv: false,
    iwave: false,
  });
  const section = sections[activeSection];
  const data = section?.data;

  if (!data) return null;

  const isImperial = projectDetails.unitSistem === 'imperial';
  const flowUnit = isImperial ? UNITS.IMPERIAL.FLOW : UNITS.SI.FLOW;
  const flowFactor = isImperial ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
  const techOptions = {
    interpolated: section.interpolated,
    artificialSeeding: section.artificialSeeding,
    alpha: section.alpha,
    step: video.parameters.step,
    fps: video.data.fps,
  };

  const hasData = (key: Technique): boolean => {
    if (key === 'lspiv') return true;
    if (key === 'stiv') return !!data.stiv_velocity_profile;
    return !!data.iwave_velocity_profile;
  };

  const isVisible = (key: Technique): boolean => data[visibilityField(key)] !== false;

  const handleActivate = (key: Technique) => {
    if (!hasData(key) || key === section.activeTechnique) return;
    onSetActiveTechnique(key);
    if (!isVisible(key)) onChangeDataValues({ type: visibilityField(key) });
  };

  const handleToggleVisibility = (key: Technique) => {
    if (key === section.activeTechnique) return;
    onChangeDataValues({ type: visibilityField(key) });
  };

  const toggleExpanded = (key: Technique) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="technique-legend">
      {TECHNIQUES.filter((tech) => hasData(tech.key)).map(({ key, label }) => {
        const isActive = key === section.activeTechnique;
        const visible = isVisible(key);
        const color = `var(--tech-${key})`;
        const effective = getEffectiveTechniqueData(data, key, techOptions);
        const totalText = effective ? (effective.total_Q * flowFactor).toFixed(2) : '—';
        const isOpen = expanded[key];
        const hasBody =
          visible &&
          (key === 'lspiv' ||
            (key === 'stiv' && !!data.stiv_sigma_profile) ||
            (key === 'iwave' && !!data.iwave_quality_profile));

        return (
          <Fragment key={key}>
            <TechniqueRow technique={key} active={isActive} hidden={!visible}>
              <button
                type="button"
                className={`technique-name${isActive ? ' technique-name-active' : ''}`}
                aria-pressed={isActive}
                onClick={() => handleActivate(key)}
                style={isActive ? { color } : undefined}
                title={
                  isActive ? t('Results.activeTechnique') : t('Results.activateTechnique', { technique: label })
                }
              >
                {label}
              </button>
              <span className="technique-row-total" title={`${totalText} ${flowUnit}`}>
                {totalText}
              </span>
              <button
                type="button"
                className="technique-eye-btn"
                disabled={isActive}
                title={
                  isActive
                    ? t('Results.cantHideActiveTechnique')
                    : t(visible ? 'Results.hideTechnique' : 'Results.showTechnique', { technique: label })
                }
                onClick={() => handleToggleVisibility(key)}
              >
                {visible ? <LuEye size={15} /> : <LuEyeOff size={15} />}
              </button>
              {hasBody && (
                <button
                  type="button"
                  className={`technique-disclosure-btn${isOpen ? ' technique-disclosure-btn-open' : ''}`}
                  aria-expanded={isOpen}
                  aria-label={
                    isOpen
                      ? t('Results.collapseTechnique', {
                          defaultValue: 'Collapse {{technique}} layers',
                          technique: label,
                        })
                      : t('Results.expandTechnique', {
                          defaultValue: 'Expand {{technique}} layers',
                          technique: label,
                        })
                  }
                  onClick={() => toggleExpanded(key)}
                >
                  <LuChevronRight size={15} />
                </button>
              )}
            </TechniqueRow>
            {isOpen && hasBody && (
              <div className="technique-row-body">
                {key === 'lspiv' && (
                  <button
                    type="button"
                    className={`technique-row-body-toggle${section.artificialSeeding ? ' technique-row-body-toggle-on' : ''}`}
                    aria-pressed={!!section.artificialSeeding}
                    onClick={() => onUpdateSection({ artificialSeeding: 'artificial-seeding' }, undefined)}
                  >
                    {t(section.artificialSeeding ? 'Results.seeded' : 'Results.unseeded')}
                  </button>
                )}
                {key === 'lspiv' && (
                  <>
                    <button
                      type="button"
                      className={`technique-row-body-toggle${data.showVelocityStd ? ' technique-row-body-toggle-on' : ''}`}
                      aria-pressed={!!data.showVelocityStd}
                      title={t('Results.showVelStd')}
                      onClick={() => onChangeDataValues({ type: 'showVelocityStd' })}
                    >
                      {t('Results.showVelStdLabel', { defaultValue: 'σ band' })}
                    </button>
                    <button
                      type="button"
                      className={`technique-row-body-toggle${data.showPercentile ? ' technique-row-body-toggle-on' : ''}`}
                      aria-pressed={!!data.showPercentile}
                      title={t('Results.showProfile')}
                      onClick={() => onChangeDataValues({ type: 'showPercentile' })}
                    >
                      {t('Results.showProfileLabel', { defaultValue: '5–95% band' })}
                    </button>
                  </>
                )}
                {key === 'stiv' && data.stiv_sigma_profile && (
                  <button
                    type="button"
                    className={`technique-row-body-toggle${data.showStivStd ? ' technique-row-body-toggle-on' : ''}`}
                    aria-pressed={!!data.showStivStd}
                    title={t('Results.showStivStd')}
                    onClick={() => onChangeDataValues({ type: 'showStivStd' })}
                  >
                    {t('Results.showStivStdLabel', { defaultValue: 'σ band' })}
                  </button>
                )}
                {key === 'iwave' && data.iwave_quality_profile && (
                  <button
                    type="button"
                    className={`technique-row-body-toggle${data.showIwaveQuality ? ' technique-row-body-toggle-on' : ''}`}
                    aria-pressed={!!data.showIwaveQuality}
                    title={t('Results.showIwaveQuality')}
                    onClick={() => onChangeDataValues({ type: 'showIwaveQuality' })}
                  >
                    {t('Results.showIwaveQualityLabel', { defaultValue: 'Quality shading' })}
                  </button>
                )}
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
};
