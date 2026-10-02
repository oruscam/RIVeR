import { useTranslation } from 'react-i18next';
import { getUnit } from '../../helpers';
import { useProjectSlice, useSectionSlice } from '../../hooks';
import { REPORT_FLOW, UNIT_CONVERSIONS } from '../../constants/constants';
import { buildProfilePlot, plotInputFromSection, type PlotMarker } from '../../helpers/reportPlot';
import { TECHNIQUE_LABEL } from '../../helpers/reportModel';
import type { Technique } from '../../store/section/types';

const Marker = ({ technique, m }: { technique: Technique; m: PlotMarker }) => {
  const cls = `rp-marker rp-marker--${technique}${m.hollow ? ' rp-marker--hollow' : ''}`;
  if (technique === 'lspiv') return <circle className={cls} cx={m.x} cy={m.y} r={2.2} />;
  if (technique === 'stiv') return <rect className={cls} x={m.x - 2} y={m.y - 2} width={4} height={4} />;
  return <path className={cls} d={`M${m.x},${m.y - 2.6}L${m.x + 2.4},${m.y + 1.8}L${m.x - 2.4},${m.y + 1.8}Z`} />;
};

/** Discharge per station, surface velocity per technique and depth on one x axis, drawn for paper. */
export const ProfilePlot = ({ storeIndex }: { storeIndex: number }) => {
  const { t } = useTranslation();
  const { sections } = useSectionSlice();
  const { projectDetails, video } = useProjectSlice();
  const section = sections[storeIndex];
  if (!section?.data) return null;

  const { unitSistem } = projectDetails;
  const imperial = unitSistem === 'imperial';
  const input = plotInputFromSection(
    section.data,
    section.activeTechnique,
    {
      interpolated: section.interpolated,
      artificialSeeding: section.artificialSeeding,
      alpha: section.alpha,
      step: video.parameters.step,
      fps: video.data.fps,
    },
    { length: imperial ? UNIT_CONVERSIONS.M_TO_FT : 1, flow: imperial ? UNIT_CONVERSIONS.M3_TO_FT3 : 1 },
    {
      q: `${t('Report.Doc.plotQ', { defaultValue: 'Discharge per station' })} Q (${getUnit(unitSistem, 'flow')})`,
      v: `${t('Report.Doc.plotV', { defaultValue: 'Surface velocity' })} Vs (${getUnit(unitSistem, 'velocity')})`,
      d: `${t('Report.Doc.plotD', { defaultValue: 'Depth' })} d (${getUnit(unitSistem, 'longitude')})`,
    }
  );
  if (!input) return null;
  const g = buildProfilePlot(input);
  const lineLabel = (technique: Technique, active: boolean) =>
    `${TECHNIQUE_LABEL[technique]}${active ? ` · ${t('Report.Doc.reported', { defaultValue: 'reported' })}` : ''}`;
  const legend = [...g.series].reverse();

  return (
    <svg
      className="rp"
      width={REPORT_FLOW.PLOT_WIDTH}
      height={REPORT_FLOW.PLOT_HEIGHT}
      viewBox={`0 0 ${g.width} ${g.height}`}
    >
      {[g.panels.q, g.panels.v, g.panels.d].map((p) => (
        <g key={p.top}>
          <text className="rp-title" x={g.left} y={p.top - 4}>
            {p.title}
          </text>
          {p.ticks.map((tk) => (
            <g key={tk.label}>
              <line
                className={tk.zero ? 'rp-grid rp-grid--zero' : 'rp-grid'}
                x1={g.left}
                x2={g.width - g.right}
                y1={tk.y}
                y2={tk.y}
              />
              <text className="rp-tick" x={g.left - 4} y={tk.y + 2.8} textAnchor="end">
                {tk.label}
              </text>
            </g>
          ))}
        </g>
      ))}

      {g.bars.map((b, i) => (
        <rect
          key={i}
          className={`rp-bar rp-bar--${section.activeTechnique}`}
          x={b.x}
          y={b.y}
          width={b.width}
          height={b.height}
        />
      ))}

      {g.series.map((s) => (
        <g key={s.technique}>
          <path className={`rp-line rp-line--${s.technique}${s.active ? ' rp-line--active' : ''}`} d={s.path} />
          {s.markers.map((m, i) => (
            <Marker key={i} technique={s.technique} m={m} />
          ))}
        </g>
      ))}

      {g.series.length > 1 &&
        legend.map((s, k) => {
          const x = g.width - g.right - 168 + k * 62;
          const y = g.panels.v.top - 7;
          return (
            <g key={s.technique}>
              <Marker technique={s.technique} m={{ x, y, hollow: false }} />
              <text className="rp-legend" x={x + 6} y={y + 2.8}>
                {lineLabel(s.technique, s.active)}
              </text>
            </g>
          );
        })}

      <path className="rp-water" d={g.bed.area} />
      <path className="rp-bed" d={g.bed.line} />

      {g.xTicks
        .filter((tk) => tk.x > g.banks.left + 12 && tk.x < g.banks.right - 12)
        .map((tk) => (
          <text key={tk.label} className="rp-tick" x={tk.x} y={g.xAxisY} textAnchor="middle">
            {tk.label}
          </text>
        ))}
      <text className="rp-bank rp-bank--left" x={g.banks.left} y={g.xAxisY} textAnchor="start">
        L
      </text>
      <text className="rp-bank rp-bank--right" x={g.banks.right} y={g.xAxisY} textAnchor="end">
        R
      </text>
      <text className="rp-tick" x={(g.banks.left + g.banks.right) / 2} y={g.xAxisY + 11} textAnchor="middle">
        {t('Report.Doc.station', { defaultValue: 'Station' })} x ({getUnit(unitSistem, 'longitude')})
      </text>
    </svg>
  );
};
