import { Wizard } from 'react-use-wizard';
import {
  HomePage,
  FootageMode,
  VideoRange,
  CrossSections,
  Processing,
  Analize,
  Results,
  Uav,
  Ipcam,
  Oblique,
} from './pages/index';
import './App.css';
import { useEffect } from 'react';
import { Loading } from './components';
import { Report } from './pages/Report';
import { useDataSlice, useProjectSlice, useUiSlice } from './hooks';
import { FOOTAGE_TYPES } from './constants/constants';

export const App: React.FC = () => {
  const { darkMode, isLoading, onSetScreen } = useUiSlice();
  const { type, video } = useProjectSlice();
  const { data, parameters } = video;
  const { onSetImages, images } = useDataSlice();
  const { factor } = parameters;

  const getStep4 = () => {
    switch (type) {
      case FOOTAGE_TYPES.UAV:
        return <Uav />;

      case FOOTAGE_TYPES.OBLIQUE:
        return <Oblique />;

      case FOOTAGE_TYPES.IPCAM:
        return <Ipcam />;

      default:
        return <HomePage/>;
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      onSetScreen({
        windowWidth: width,
        windowHeight: height,
        imageWidth: data.width * factor,
        imageHeight: data.height * factor,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [data, factor]);

  useEffect(() => {
    const handleAllFrames = (_event: any, paths: string[]) => {
      onSetImages(paths);
    };

    if (images.paths.length === 0) {
      window.ipcRenderer.on('all-frames', handleAllFrames);
    }
  }, [images.paths]);

  return (
    <div className="default-app-container" data-theme={darkMode ? 'dark' : 'light'}>
      <Wizard>
        {isLoading ? <Loading /> : <HomePage />}
        {isLoading ? <Loading /> : <FootageMode></FootageMode>}
        {isLoading ? <Loading /> : <VideoRange />}
        {isLoading ? <Loading /> : getStep4()}
        {isLoading ? <Loading /> : <CrossSections />}
        {isLoading ? <Loading /> : <Processing />}
        {isLoading ? <Loading /> : <Analize />}
        {isLoading ? <Loading /> : <Results />}
        <Report />
      </Wizard>
    </div>
  );
};
