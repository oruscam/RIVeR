import { FixedSizeList } from "react-window";

// This function is used to handle the onClick event of the image carousel
// It sets the active image to the clicked image and updates the default value

const carouselClickImage = (
  active: number,
  index: number,
  paths: string[],
  isBackendWorking: boolean,
  listRef: FixedSizeList,
  setShowMedian: ((value: boolean) => void) | undefined,
  onSetActiveImage: (value: number) => void,
  setDefaultValue: (value: number) => void,
  mode: string,
) => {
  if (
    index !== (mode === "ipcam" ? paths.length : paths.length - 1) &&
    !isBackendWorking
  ) {
    onSetActiveImage(index);
    setDefaultValue(index + 1);
    if (index > active) {
      listRef.scrollToItem(index + 1);
    } else {
      listRef.scrollToItem(index - 1);
    }
    if (setShowMedian) {
      setShowMedian(false);
    }
  }
};

// This function is used to handle the onKeyDown event of the input element in the image carousel
// It sets the active image to the value entered in the input element and updates the default value

const carouselKeyDown = (
  event: React.KeyboardEvent<HTMLInputElement>,
  paths: string[],
  onSetActiveImage: (value: number) => void,
  setDefaultValue: (value: number) => void,
  active: number,
  listRef: FixedSizeList,
  mode: string,
) => {
  if (event.key === "Enter") {
    const value = parseInt(event.currentTarget.value);
    if (
      value > 0 &&
      value <= (mode === "ipcam" ? paths.length : paths.length - 1)
    ) {
      onSetActiveImage(value - 1);
      setDefaultValue(value);
      listRef.scrollToItem(value - 1, "center");
    } else {
      setDefaultValue(active + 1);
    }
  }
};

const carouselMediaClick = (
  setShowMedian: ((value: boolean) => void) | undefined,
) => {
  setShowMedian!(true);
};

const scroll = (
  direction: "forward" | "backward",
  listRef: any,
  speed: number = 300,
) => {
  if (listRef.current) {
    const currentOffset = listRef.current.state.scrollOffset;
    const newOffset =
      direction === "forward" ? currentOffset + speed : currentOffset - speed;
    listRef.current.scrollTo(newOffset);
  }
};

const carouselMouseDown = (
  direction: "forward" | "backward",
  listRef: any,
  setScrollInterval: (value: any) => void,
  setSpeedUpTimeout: (value: any) => void,
) => {
  scroll(direction, listRef);
  const interval = setInterval(() => scroll(direction, listRef), 100);
  setScrollInterval(interval);

  const timeout = setTimeout(() => {
    clearInterval(interval);
    const fastInterval = setInterval(
      () => scroll(direction, listRef, 600),
      100,
    );
    setScrollInterval(fastInterval);
  }, 2000);
  setSpeedUpTimeout(timeout);
};

const carouselMouseUp = (
  scrollInterval: NodeJS.Timeout | null,
  speedUpTimeout: NodeJS.Timeout | null,
  setScrollInterval: (value: any) => void,
  setSpeedUpTimeout: (value: any) => void,
) => {
  if (scrollInterval) {
    clearInterval(scrollInterval);
    setScrollInterval(null);
  }
  if (speedUpTimeout) {
    clearTimeout(speedUpTimeout);
    setSpeedUpTimeout(null);
  }
};

export {
  carouselClickImage,
  carouselKeyDown,
  carouselMediaClick,
  carouselMouseDown,
  carouselMouseUp,
};
