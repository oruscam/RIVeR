import { useAutoShrinkFont, useDataSlice, useUiSlice, useResizableCarousel } from '../hooks';
import React, { useRef, useState, useEffect } from 'react';
import { useWizard } from 'react-use-wizard';
import { MODULE_NUMBER } from '../constants/constants';
import { FixedSizeList as List } from 'react-window';
import { carouselClickImage, carouselKeyDown } from '../helpers';
import { useTranslation } from 'react-i18next';
import { carouselMouseDown, carouselMouseUp, setCarouselDimensions } from '../helpers/carouselFunctions';
import { back, play as next } from '../assets/icons/icons';
import { Icon } from './Icon';

interface CarouselProps {
  images: string[];
  active: number;
  setActiveImage: (index: number) => void;
  showMedian?: boolean;
  setShowMedian?: (value: boolean) => void;
  canToggleMedian?: boolean;
  mode: 'processing' | 'analize' | 'ipcam' | 'select';
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
}

export const Carousel: React.FC<CarouselProps> = ({
  images,
  active,
  setActiveImage,
  showMedian,
  setShowMedian,
  canToggleMedian,
  mode,
}) => {
  const { t } = useTranslation();
  const { isBackendWorking } = useDataSlice();
  const [width, setWidth] = useState<number>(500);
  const { screenSizes } = useUiSlice();

  const [baseItemWidth, setBaseItemWidth] = useState<number>(275);
  const [baseCarouselHeight, setBaseCarouselHeight] = useState<number>(190);
  const ratioRef = useRef<number>(275 / 190);

  useEffect(() => {
    if (baseCarouselHeight > 0) {
      ratioRef.current = baseItemWidth / baseCarouselHeight;
    }
  }, [baseItemWidth, baseCarouselHeight]);

  const { height: carouselHeight, onDragHandleMouseDown } = useResizableCarousel({
    storageKey: 'river-main-carousel-height',
    defaultHeight: baseCarouselHeight,
    minHeight: 80,
    maxHeight: 350,
  });

  const itemWidth = Math.round(carouselHeight * ratioRef.current);

  const [defaultValue, setDefaultValue] = useState<string | number>((active + 1) as string | number);
  const [scrollInterval, setScrollInterval] = useState<NodeJS.Timeout | null>(null);
  const [speedUpTimeout, setSpeedUpTimeout] = useState<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<List>(null);
  const listOuterRef = useRef<HTMLDivElement>(null);
  const stabilizationButtonRef = useAutoShrinkFont<HTMLButtonElement>([t]);

  const { activeStep } = useWizard();

  // Only Processing pairs consecutive frames for PIV — every other mode is a plain single-frame browser.
  const isPairMode = mode === 'analize';
  const isSingleSelectMode = !isPairMode;

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDefaultValue(event.currentTarget.value);
  };

  const Row: React.FC<RowProps> = ({ index, style }) => {
    let className = 'img-carousel';
    if (index === active && !showMedian) {
      className = 'img-carousel-active img-carousel';
    } else if (index === active + 1 && !showMedian && isPairMode) {
      className = 'img-carousel-second img-carousel';
    }

    return (
      <div
        key={index}
        className="img-carousel-container"
        onClick={() =>
          carouselClickImage(
            active,
            index,
            images,
            isBackendWorking,
            listRef.current!,
            setShowMedian,
            setActiveImage,
            setDefaultValue,
            mode
          )
        }
        style={style}
      >
        <img src={images[index]} alt={`Slide ${index}`} className={className}></img>
        {mode !== 'ipcam' && <div className="img-water-mark"> {index + 1}</div>}
      </div>
    );
  };

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
      setCarouselDimensions(screenSizes, setBaseItemWidth, setBaseCarouselHeight);
    };

    updateDimensions(); // Set initial dimensions
    window.addEventListener('resize', updateDimensions); // Update dimensions on window resize

    return () => {
      window.removeEventListener('resize', updateDimensions); // Cleanup event listener
    };
  }, [screenSizes]);

  useEffect(() => {
    if (isSingleSelectMode && listRef.current) {
      listRef.current.scrollToItem(active, 'center');
    }
  }, [active, isSingleSelectMode]);

  return (
    <div ref={containerRef} className={`carousel-container mt-1 ${isBackendWorking ? 'disabled' : ''}`}>
      <div className="carousel-resize-handle" onMouseDown={onDragHandleMouseDown} />
      <div className="carousel-info">
        {/* Pixel Size reuses the same showMedian/setShowMedian/canToggleMedian wiring to
            toggle the stabilization sanity-check image instead of a median composite. */}
        {activeStep === MODULE_NUMBER.PIXEL_SIZE && canToggleMedian && (
          <button
            ref={stabilizationButtonRef}
            className={`wizard-button button-rectification ${showMedian ? 'wizard-button-active' : ''}`}
            onClick={() => setShowMedian!(!showMedian)}
          >
            {' '}
            {t('PixelSize.carouselStabilization')}{' '}
          </button>
        )}
        <div>
          <input
            value={defaultValue}
            onChange={handleInputChange}
            onKeyDown={(event) =>
              carouselKeyDown(event, images, setActiveImage, setDefaultValue, active, listRef.current!, mode)
            }
            disabled={isBackendWorking}
          />
          <p> / {images.length} </p>
        </div>
      </div>
      <div className="carousel">
        <button
          id="carousel-backward"
          className="video-button"
          onMouseDown={() => carouselMouseDown('backward', listRef, setScrollInterval, setSpeedUpTimeout)}
          onMouseUp={() => carouselMouseUp(scrollInterval, speedUpTimeout, setScrollInterval, setSpeedUpTimeout)}
          onMouseLeave={() =>
            carouselMouseUp(scrollInterval, speedUpTimeout, setScrollInterval, setSpeedUpTimeout)
          }
        >
          {' '}
          <Icon path={back} />{' '}
        </button>
        <List
          height={carouselHeight}
          itemCount={images.length}
          itemSize={itemWidth}
          layout="horizontal"
          width={width}
          className="carousel-list"
          ref={listRef}
          outerRef={listOuterRef}
        >
          {Row}
        </List>
        <button
          id="carousel-forward"
          className="video-button"
          onMouseDown={() => carouselMouseDown('forward', listRef, setScrollInterval, setSpeedUpTimeout)}
          onMouseUp={() => carouselMouseUp(scrollInterval, speedUpTimeout, setScrollInterval, setSpeedUpTimeout)}
          onMouseLeave={() =>
            carouselMouseUp(scrollInterval, speedUpTimeout, setScrollInterval, setSpeedUpTimeout)
          }
        >
          {' '}
          <Icon path={next} />
        </button>
      </div>
    </div>
  );
};
