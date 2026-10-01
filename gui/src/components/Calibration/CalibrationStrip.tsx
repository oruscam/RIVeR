import { memo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useResizableCarousel } from '../../hooks';
import { toCalFileUrl } from '../../helpers/calFileUrl';
import { Icon } from '../Icon';
import { back, play } from '../../assets/icons/icons';
import { scrollBehavior } from '../../helpers/motion';

interface ThumbProps {
  img: string;
  thumbSrc: string;
  idx: number;
  active: boolean;
  unused: boolean;
  notUsedLabel: string;
  notUsedTag: string;
  onSelect: (index: number) => void;
}

const StripThumb = memo(
  ({ img, thumbSrc, idx, active, unused, notUsedLabel, notUsedTag, onSelect }: ThumbProps) => {
    const handleClick = useCallback(() => onSelect(idx), [onSelect, idx]);
    return (
      <button
        type="button"
        className="img-carousel-container cal-strip-thumb"
        onClick={handleClick}
        title={unused ? notUsedLabel : img.split('/').pop()}
      >
        <img
          src={toCalFileUrl(thumbSrc)}
          alt=""
          loading="lazy"
          className={`img-carousel${active ? ' img-carousel-active' : ''}${unused ? ' cal-strip-unused' : ''}`}
        />
        <span className="img-water-mark">{idx + 1}</span>
        {unused && <span className="cal-strip-unused-tag">{notUsedTag}</span>}
      </button>
    );
  }
);

interface CalibrationStripProps {
  images: string[];
  thumbs: string[];
  selectedIdx: number;
  onSelect: (index: number) => void;
  usedSet: ReadonlySet<string>;
  /** Only after a solve does "unused" mean anything. */
  showUnused: boolean;
}

/**
 * Calibration's thumbnail strip, built on the shared Carousel's classes so it
 * looks like every wizard step's strip (spec amendment A12) without taking on
 * the shared component's coupling to the project store and Processing.
 * calibrationLayout.test.ts pins the shared class list.
 */
export const CalibrationStrip = ({
  images,
  thumbs,
  selectedIdx,
  onSelect,
  usedSet,
  showUnused,
}: CalibrationStripProps) => {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);

  const { height: thumbHeight, onDragHandleMouseDown } = useResizableCarousel({
    storageKey: 'river-cal-carousel-height',
    defaultHeight: 90,
    minHeight: 50,
    maxHeight: 220,
    onDragProgress: (h) => {
      listRef.current?.style.setProperty('--thumb-height', `${h}px`);
      listRef.current?.style.setProperty('--thumb-width', `${Math.round(h * (56 / 42))}px`);
    },
  });
  const thumbWidth = Math.round(thumbHeight * (56 / 42));

  const scroll = useCallback((direction: 'backward' | 'forward') => {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.8 * (direction === 'backward' ? -1 : 1), behavior: scrollBehavior() });
  }, []);

  const notUsedLabel = t('Calibration.notUsed');
  const notUsedTag = t('Calibration.notUsedTag', { defaultValue: 'Not used' });

  return (
    <div className="carousel-container mt-1">
      <div className="carousel-resize-handle" onMouseDown={onDragHandleMouseDown} />
      <div className="carousel-info">
        <div>
          <input
            value={selectedIdx + 1}
            readOnly
            tabIndex={-1}
            aria-label={t('Calibration.photoNumber', { defaultValue: 'Photo' })}
          />
          <p> / {images.length} </p>
        </div>
      </div>
      <div className="carousel">
        <button type="button" className="video-button" onClick={() => scroll('backward')}>
          <Icon path={back} />
        </button>
        <div
          ref={listRef}
          className="cal-strip"
          style={
            {
              '--thumb-height': `${thumbHeight}px`,
              '--thumb-width': `${thumbWidth}px`,
            } as React.CSSProperties
          }
        >
          {images.map((img, idx) => (
            <StripThumb
              key={img}
              img={img}
              thumbSrc={thumbs[idx] ?? img}
              idx={idx}
              active={idx === selectedIdx}
              unused={showUnused && !usedSet.has(img)}
              notUsedLabel={notUsedLabel}
              notUsedTag={notUsedTag}
              onSelect={onSelect}
            />
          ))}
        </div>
        <button type="button" className="video-button" onClick={() => scroll('forward')}>
          <Icon path={play} />
        </button>
      </div>
    </div>
  );
};
