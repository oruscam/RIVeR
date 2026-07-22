import { Wizard } from 'react-use-wizard';
import {
  HomePage,
  FootageMode,
  VideoRange,
  CrossSections,
  Processing,
  Results,
  Uav,
  Ipcam,
  Oblique,
} from './pages/index';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loading } from './components';
import { Report } from './pages/Report';
import { useDataSlice, useProjectSlice, useUiSlice } from './hooks';
import { FOOTAGE_TYPES } from './constants/constants';

export const App: React.FC = () => {
  const { theme, isLoading, onSetScreen, onChangeTheme, language, onSetLanguage } = useUiSlice();
  const { i18n } = useTranslation();
  const { type, video } = useProjectSlice();
  const { data, parameters } = video;
  const { onSetImages, images } = useDataSlice();
  const { factor } = parameters;

  const LANGUAGES = Object.keys(i18n.options.resources || {});

  const getStep4 = () => {
    switch (type) {
      case FOOTAGE_TYPES.UAV:
        return <Uav />;

      case FOOTAGE_TYPES.OBLIQUE:
        return <Oblique />;

      case FOOTAGE_TYPES.IPCAM:
        return <Ipcam />;

      default:
        return <HomePage />;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === 't') {
        e.preventDefault();
        onChangeTheme();
      } else if (e.key === 'l') {
        e.preventDefault();
        const idx = LANGUAGES.indexOf(language);
        const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
        onSetLanguage(next);
        localStorage.setItem('language', next);
        i18n.changeLanguage(next);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [language, LANGUAGES]);

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

    // Remove this specific listener on cleanup so that if images.paths
    // changes reference (e.g. project reset) before 'all-frames' fires,
    // the old listener does not accumulate alongside the new one.
    return () => {
      window.ipcRenderer.removeListener('all-frames', handleAllFrames);
    };
  }, [images.paths]);

  return (
    <div className="default-app-container" data-theme={theme}>
      <Wizard>
        {isLoading ? <Loading /> : <HomePage />}
        {isLoading ? <Loading /> : <FootageMode></FootageMode>}
        {isLoading ? <Loading /> : <VideoRange />}
        {isLoading ? <Loading /> : getStep4()}
        {isLoading ? <Loading /> : <CrossSections />}
        {isLoading ? <Loading /> : <Processing />}
        {isLoading ? <Loading /> : <Results />}
        <Report />
      </Wizard>
    </div>
  );
};
