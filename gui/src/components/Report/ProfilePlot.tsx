import { useTranslation } from 'react-i18next';
import { getUnit } from '../../helpers';
import { useProjectSlice, useSectionSlice } from '../../hooks';
import { REPORT_FLOW, UNIT_CONVERSIONS } from '../../constants/constants';
import { buildProfilePlot, plotInputFromSection } from '../../helpers/reportPlot';
import type { Technique } from '../../store/section/types';

/** Same shape per technique as the Results chart (● ■ ▲); r is the circle radius. */
const Marker = ({
  technique,
  x,
  y,
  r,
  className,
}: {
  technique: Technique;
  x: number;
  y: number;
  r: number;
  className: string;
}) => {
  if (technique === 'lspiv') return <circle className={className} cx={x} cy={y} r={r} />;
  if (technique === 'stiv')
    return <rect className={className} x={x - r * 0.9} y={y - r * 0.9} width={r * 1.8} height={r * 1.8} />;
  const s = r * 1.2;
  return (
    <path className={className} d={`M${x},${y - s * 1.05}L${x + s},${y + s * 0.7}L${x - s},${y + s * 0.7}Z`} />
  );
};

/** Key glyphs, in neutral ink: they explain the marks, the technique row above the plot names the colours. */
const KEY_GLYPH_WIDTH = { measured: 12, interpolated: 12, rejected: 5, tuned: 7 };
// Rough advance of the 8px document font, enough to space the key items without measuring.
const KEY_CHAR_WIDTH = 4.1;
const KEY_GAP = 9;

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

  const keyItems = (
    [
      ['measured', t('Results.measured')],
      ...(g.marks.interpolated ? [['interpolated', t('Results.interpolated')]] : []),
      ...(g.marks.rejected ? [['rejected', t('Results.keyRejected')]] : []),
      ...(g.marks.tuned ? [['tuned', t('Results.keyTuned')]] : []),
    ] as [keyof typeof KEY_GLYPH_WIDTH, string][]
  ).map(([kind, label]) => ({ kind, label, width: KEY_GLYPH_WIDTH[kind] + 3 + label.length * KEY_CHAR_WIDTH }));
  const keyY = g.panels.v.top - 7;
  let keyX = g.width - g.right - keyItems.reduce((sum, k, i) => sum + k.width + (i ? KEY_GAP : 0), 0);

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
          {p.ticks.map((tk, i) => (
            <g key={i}>
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

      {g.series.map((s) => {
        const r = s.active ? 2.2 : 1.8;
        return (
          <g key={s.technique}>
            {s.segments.map((seg, i) => (
              <path
                key={i}
                className={`rp-line rp-line--${s.technique}${s.active ? ' rp-line--active' : ''}${
                  seg.interp ? ' rp-line--interp' : ''
                }`}
                d={seg.d}
              />
            ))}
            {s.rejected.map((m, i) => (
              <Marker
                key={`r${i}`}
                technique={s.technique}
                x={m.x}
                y={m.y}
                r={r}
                className={`rp-marker rp-marker--hollow rp-marker--${s.technique}`}
              />
            ))}
            {s.markers.map((m, i) => (
              <g key={i}>
                {m.tuned && (
                  <Marker
                    technique={s.technique}
                    x={m.x}
                    y={m.y}
                    r={r + 2}
                    className={`rp-marker rp-marker--ring rp-marker--${s.technique}`}
                  />
                )}
                <Marker
                  technique={s.technique}
                  x={m.x}
                  y={m.y}
                  r={r}
                  className={`rp-marker rp-marker--${s.technique}`}
                />
              </g>
            ))}
          </g>
        );
      })}

      <g className="rp-key">
        {keyItems.map((k) => {
          const x = keyX;
          keyX += k.width + KEY_GAP;
          return (
            <g key={k.kind}>
              {k.kind === 'measured' && (
                <>
                  <path className="rp-key-line" d={`M${x},${keyY}H${x + 12}`} />
                  <circle className="rp-key-fill" cx={x + 6} cy={keyY} r={1.8} />
                </>
              )}
              {k.kind === 'interpolated' && (
                <path className="rp-key-line rp-key-line--interp" d={`M${x},${keyY}H${x + 12}`} />
              )}
              {k.kind === 'rejected' && <circle className="rp-key-hollow" cx={x + 2.5} cy={keyY} r={2} />}
              {k.kind === 'tuned' && (
                <>
                  <circle className="rp-key-hollow" cx={x + 3.5} cy={keyY} r={3.5} />
                  <circle className="rp-key-fill" cx={x + 3.5} cy={keyY} r={1.6} />
                </>
              )}
              <text className="rp-legend" x={x + KEY_GLYPH_WIDTH[k.kind] + 3} y={keyY + 2.8}>
                {k.label}
              </text>
            </g>
          );
        })}
      </g>

      <path className="rp-water" d={g.bed.area} />
      <path className="rp-bed" d={g.bed.line} />

      {g.xTicks
        .filter((tk) => tk.x > g.banks.left + 12 && tk.x < g.banks.right - 12)
        .map((tk, i) => (
          <text key={i} className="rp-tick" x={tk.x} y={g.xAxisY} textAnchor="middle">
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
