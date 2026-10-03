import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useTranslation } from 'react-i18next';
import { formatNumberToPrecision4, getUnit } from '../../helpers';
import { useIpcamSlice, useObliqueSlice, useProjectSlice, useUavSlice } from '../../hooks';
import { REPORT_FLOW, UNIT_CONVERSIONS } from '../../constants/constants';
import { frameBox, frameFactor } from '../../helpers/reportLayout';
import { obliqueResiduals } from '../../helpers/obliqueResiduals';
import { ipcamPointErrors } from '../../helpers/ipcamPointErrors';
import { ipcamSvg, obliqueSvg } from '../Graphs';
import { FootageIcon } from './FootageIcon';

export const hasCalibration = (type: string, ipcamSolved: boolean) =>
  type === 'uav' || type === 'oblique' || (type === 'ipcam' && ipcamSolved);

const f2 = (v: number | undefined | null) => (typeof v === 'number' ? v.toFixed(2) : '-');

/** The stores hold lengths in metres; the report shows them in the project's unit. */
const useLength = () => {
  const { projectDetails } = useProjectSlice();
  const { unitSistem } = projectDetails;
  const lF = unitSistem === 'imperial' ? UNIT_CONVERSIONS.M_TO_FT : 1;
  return {
    len: getUnit(unitSistem, 'longitude'),
    lF,
    l2: (v: number | undefined | null) => f2(typeof v === 'number' ? v * lF : v),
  };
};

const useFrame = () => {
  const { video } = useProjectSlice();
  const { width, height } = video.data;
  const box = frameBox(width, height, REPORT_FLOW.METHOD_IMAGE_WIDTH, REPORT_FLOW.METHOD_IMAGE_WIDTH);
  return { box, factor: frameFactor(width, height, video.parameters.factor, box) };
};

const Uav = () => {
  const { t } = useTranslation();
  const { size, rwLength, rwPoints, dirPoints, solution } = useUavSlice();
  const { len, lF, l2 } = useLength();
  const ortho = solution
    ? frameBox(solution.width, solution.height, REPORT_FLOW.METHOD_IMAGE_WIDTH, REPORT_FLOW.METHOD_IMAGE_WIDTH)
    : null;
  return (
    <>
      {solution && ortho && (
        <figure className="doc-figure mc-img">
          <img src={solution.orthoImage} width={ortho.width} height={ortho.height} />
          <figcaption>{t('Report.Doc.rectified', { defaultValue: 'Rectified frame' })}</figcaption>
        </figure>
      )}
      <dl className="doc-kv">
        <dt>{t('Report.Doc.pixelSize', { defaultValue: 'Pixel size (GSD)' })}</dt>
        <dd>
          {/* Pixel size is the declared exception to 2 decimals: ~0.01 m/px needs significant digits. */}
          {formatNumberToPrecision4(size * lF)} {len}/px
        </dd>
        <dt>{t('Report.Doc.referenceLength', { defaultValue: 'Reference length' })}</dt>
        <dd>
          {l2(rwLength)} {len}
        </dd>
      </dl>
      <table className="doc-table doc-table--numeric">
        <thead>
          <tr>
            <th>{t('Report.Doc.point', { defaultValue: 'Point' })}</th>
            <th>x px</th>
            <th>y px</th>
            <th>X {len}</th>
            <th>Y {len}</th>
          </tr>
        </thead>
        <tbody>
          {dirPoints.map((p, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{f2(p.x)}</td>
              <td>{f2(p.y)}</td>
              <td>{l2(rwPoints[i]?.x)}</td>
              <td>{l2(rwPoints[i]?.y)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

const Oblique = ({ measure = false }: { measure?: boolean }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const { firstFramePath } = useProjectSlice();
  const { coordinates, rwCoordinates, distances, solution } = useObliqueSlice();
  const { box, factor } = useFrame();
  const { len, l2 } = useLength();
  // rwCoordinates default to four zero points; they only mean something once the calibration is solved.
  const solved = solution !== null;
  const residuals = solved ? obliqueResiduals(rwCoordinates, distances) : null;

  useEffect(() => {
    d3.select(svgRef.current).selectAll('*').remove();
    if (measure) return;
    if (svgRef.current) {
      obliqueSvg({
        factor,
        coordinates,
        distances,
        svgElement: svgRef.current,
        width: box.width,
        height: box.height,
        pinDivisor: REPORT_FLOW.METHOD_PIN_DIVISOR,
      });
    }
  }, [factor, coordinates, distances, box.width, box.height, measure]);

  return (
    <>
      <figure className="doc-figure mc-img">
        <img src={firstFramePath} width={box.width} height={box.height} />
        <svg ref={svgRef} className="doc-overlay" width={box.width} height={box.height} />
      </figure>
      <div className="doc-cols">
        <table className="doc-table doc-table--numeric">
          <thead>
            <tr>
              <th>{t('Report.Doc.point', { defaultValue: 'Point' })}</th>
              <th>x px</th>
              <th>y px</th>
              {solved && <th>X {len}</th>}
              {solved && <th>Y {len}</th>}
            </tr>
          </thead>
          <tbody>
            {coordinates.map((p, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{f2(p.x)}</td>
                <td>{f2(p.y)}</td>
                {solved && <td>{l2(rwCoordinates[i]?.x)}</td>}
                {solved && <td>{l2(rwCoordinates[i]?.y)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {residuals && (
          <table className="doc-table doc-table--numeric">
            <thead>
              <tr>
                <th>{t('Report.Doc.pair', { defaultValue: 'Pair' })}</th>
                <th>
                  {t('Report.Doc.entered', { defaultValue: 'Entered' })} {len}
                </th>
                <th>
                  {t('Report.Doc.solved', { defaultValue: 'Solved' })} {len}
                </th>
              </tr>
            </thead>
            <tbody>
              {residuals.map((r) => (
                <tr key={r.pair}>
                  <td>{r.label}</td>
                  <td>{l2(r.entered)}</td>
                  <td>{l2(r.solved)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

const Ipcam = ({ measure = false }: { measure?: boolean }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const { firstFramePath } = useProjectSlice();
  const { points, cameraSolution } = useIpcamSlice();
  const { box, factor } = useFrame();
  const { len, l2 } = useLength();

  useEffect(() => {
    d3.select(svgRef.current).selectAll('*').remove();
    if (measure) return;
    if (svgRef.current && points !== null) {
      ipcamSvg({
        factor,
        points,
        svgElement: svgRef.current,
        width: box.width,
        height: box.height,
        pinDivisor: REPORT_FLOW.METHOD_PIN_DIVISOR,
      });
    }
  }, [points, factor, box.width, box.height, measure]);

  if (!cameraSolution || !points) return null;
  const { meanError, cameraPosition, reprojectionErrors, pointIndices } = cameraSolution;
  const rows = ipcamPointErrors(points, { reprojectionErrors, pointIndices });
  const yes = t('Commons.yes');

  return (
    <>
      <figure className="doc-figure mc-img">
        <img src={firstFramePath} width={box.width} height={box.height} />
        <svg ref={svgRef} className="doc-overlay" width={box.width} height={box.height} />
      </figure>
      <dl className="doc-kv">
        <dt>{t('Report.Doc.meanError', { defaultValue: 'Mean reprojection error' })}</dt>
        <dd>{f2(meanError)} px</dd>
        <dt>{t('Report.Doc.cameraPosition', { defaultValue: 'Camera position X / Y / Z' })}</dt>
        <dd>
          {cameraPosition.map(l2).join(' / ')} {len}
        </dd>
      </dl>
      <table className="doc-table doc-table--numeric">
        <thead>
          <tr>
            <th>{t('Report.Doc.point', { defaultValue: 'Point' })}</th>
            <th>X {len}</th>
            <th>Y {len}</th>
            <th>Z {len}</th>
            <th>{t('Report.Doc.error', { defaultValue: 'Error' })} px</th>
            <th>{t('Report.Doc.inSolve', { defaultValue: 'In solve' })}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const p = points[r.index];
            return (
              <tr key={r.index}>
                <td>{r.label}</td>
                <td>{l2(p.X)}</td>
                <td>{l2(p.Y)}</td>
                <td>{l2(p.Z)}</td>
                <td>{f2(r.error)}</td>
                <td>{r.used ? yes : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

export const CalibrationPanel = ({ measure = false }: { measure?: boolean }) => {
  const { t } = useTranslation();
  const { type } = useProjectSlice();
  const label = { uav: 'UAV', oblique: 'Oblique', ipcam: 'IP camera' }[type as 'uav' | 'oblique' | 'ipcam'] ?? '';
  return (
    <section className="mc">
      <h3 className="mc-title">
        <FootageIcon type={type as 'uav' | 'oblique' | 'ipcam' | ''} />
        {t('Report.Doc.calibration', { defaultValue: 'Calibration' })} · {label}
      </h3>
      {type === 'uav' && <Uav />}
      {type === 'oblique' && <Oblique measure={measure} />}
      {type === 'ipcam' && <Ipcam measure={measure} />}
    </section>
  );
};
