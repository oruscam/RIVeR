import { useTranslation } from 'react-i18next';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { useSectionSlice } from '../../hooks';
import { TECHNIQUE_COLORS } from '../../constants/constants';
import { Technique } from '../../store/section/types';
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
 * — goal 1); the eye icon toggles chart visibility independently (goal 2); trailing glyphs
 * toggle that technique's uncertainty band/quality shading (goal 4), hidden while the
 * technique itself is hidden — nothing to control for a series that isn't drawn.
 */
export const TechniqueLegend = () => {
  const { sections, activeSection, onSetActiveTechnique, onChangeDataValues, onUpdateSection } = useSectionSlice();
  const { t } = useTranslation();
  const section = sections[activeSection];
  const data = section?.data;

  if (!data) return null;

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

  return (
    <div className="technique-legend">
      {TECHNIQUES.filter((tech) => hasData(tech.key)).map(({ key, label }) => {
        const isActive = key === section.activeTechnique;
        const visible = isVisible(key);
        const color = isActive ? 'var(--primary-text-color)' : TECHNIQUE_COLORS[key];

        return (
          <div key={key} className={`technique-row${visible ? '' : ' technique-row-hidden'}`}>
            <span className="technique-swatch" style={{ background: color }} />
            <span
              className={`technique-name${isActive ? ' technique-name-active' : ''}`}
              onClick={() => handleActivate(key)}
              title={
                isActive ? t('Results.activeTechnique') : t('Results.activateTechnique', { technique: label })
              }
            >
              {label}
            </span>
            {key === 'lspiv' && (
              <button
                type="button"
                className={`technique-seed-flag${section.artificialSeeding ? ' technique-seed-flag-seeded' : ''}`}
                title={section.artificialSeeding ? t('Results.seededHint') : t('Results.unseededHint')}
                onClick={() => onUpdateSection({ artificialSeeding: 'artificial-seeding' }, undefined)}
              >
                {t(section.artificialSeeding ? 'Results.seeded' : 'Results.unseeded')}
              </button>
            )}
            {visible && (
              <span className="technique-band-glyphs">
                {key === 'lspiv' && (
                  <>
                    <button
                      type="button"
                      className={`technique-band-glyph${data.showVelocityStd ? ' technique-band-glyph-on' : ''}`}
                      title={t('Results.showVelStd')}
                      onClick={() => onChangeDataValues({ type: 'showVelocityStd' })}
                    >
                      σ
                    </button>
                    <button
                      type="button"
                      className={`technique-band-glyph${data.showPercentile ? ' technique-band-glyph-on' : ''}`}
                      title={t('Results.showProfile')}
                      onClick={() => onChangeDataValues({ type: 'showPercentile' })}
                    >
                      %
                    </button>
                  </>
                )}
                {key === 'stiv' && data.stiv_sigma_profile && (
                  <button
                    type="button"
                    className={`technique-band-glyph${data.showStivStd ? ' technique-band-glyph-on' : ''}`}
                    title={t('Results.showStivStd')}
                    onClick={() => onChangeDataValues({ type: 'showStivStd' })}
                  >
                    σ
                  </button>
                )}
                {key === 'iwave' && data.iwave_quality_profile && (
                  <button
                    type="button"
                    className={`technique-band-glyph${data.showIwaveQuality ? ' technique-band-glyph-on' : ''}`}
                    title={t('Results.showIwaveQuality')}
                    onClick={() => onChangeDataValues({ type: 'showIwaveQuality' })}
                  >
                    Q
                  </button>
                )}
              </span>
            )}
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
          </div>
        );
      })}
    </div>
  );
};
