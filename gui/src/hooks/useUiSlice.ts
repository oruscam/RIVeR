/**
 * @file useUiSlice.ts
 * @description This file contains the custom hook for the UI slice.
 */

import { useDispatch, useSelector } from 'react-redux';
import {
  changeTheme,
  setTheme,
  setErrorMessage,
  clearErrorMessage,
  setInfoMessage,
  clearInfoMessage,
  setWarningMessage,
  clearWarningMessage,
  setSeeAll,
  setScreen,
  setLanguage,
  setIsLastVersion,
  setMessage,
  setHoveredStation,
  setShowInterrogationWindow,
} from '../store/ui/uiSlice';
import { ThemeType } from '../store/ui/types';
import { RootState } from '../store/store';
import { getNewImageResolution } from '../helpers';

/**
 * @returns - Object with the methods and attributes to interact with the ui slice
 */

export const useUiSlice = () => {
  const {
    theme,
    error,
    info,
    warning,
    isLoading,
    seeAll,
    screenSizes,
    message,
    language,
    isLatestVersion,
    latestVersion,
    hoveredStation,
    showInterrogationWindow,
  } = useSelector((state: RootState) => state.ui);
  const dispatch = useDispatch();

  /** Derived boolean for backward-compat code that checks darkMode */
  const darkMode = theme !== 'light';

  /**
   * Cycle through themes: dark → light → dracula → dark
   */
  const onChangeTheme = () => {
    dispatch(changeTheme());
  };

  /**
   * Directly set a specific theme
   */
  const onSetTheme = (t: ThemeType) => {
    dispatch(setTheme(t));
  };

  /**
   * Method to set the error message on the UI slice.
   * After 4 seconds the error message will be cleared.
   * @param error - String with the error message
   * @param error - Object with the error message
   */

  const onSetErrorMessage = (error: Record<string, { type: string; message: string }> | string) => {
    if (typeof error === 'string') {
      dispatch(setErrorMessage([error]));
    } else {
      let arrayOfErrors: string[] = [];
      if (error !== undefined) {
        Object.entries(error).every(([, value]) => {
          if (typeof value === 'string' && value) {
            arrayOfErrors.push(value);
          } else if (value && value.type === 'required' && value.message) {
            arrayOfErrors = [value.message];
            return false;
          } else if (value && value.message) {
            arrayOfErrors.push(value.message);
          }
          return true;
        });
        dispatch(setErrorMessage(arrayOfErrors));
      }
    }
    setTimeout(() => {
      dispatch(clearErrorMessage());
    }, 5000);
  };

  /**
   * Method to set an informational (non-error) message on the UI slice.
   * After 5 seconds the info message will be cleared.
   * @param info - String with the info message
   */

  const onSetInfoMessage = (info: string) => {
    dispatch(setInfoMessage([info]));
    setTimeout(() => {
      dispatch(clearInfoMessage());
    }, 5000);
  };

  /**
   * Method to set a persistent warning message on the UI slice, shown while an
   * action is ongoing (e.g. editing stabilization regions). Unlike error/info,
   * it does not auto-clear on a timer — the caller must clear it explicitly
   * with onClearWarningMessage once the action finishes.
   * @param warning - String with the warning message
   */

  const onSetWarningMessage = (warning: string) => {
    dispatch(setWarningMessage([warning]));
  };

  const onClearWarningMessage = () => {
    dispatch(clearWarningMessage());
  };

  /**
   * Method to overwrite the persistent loading message on the UI slice
   * (e.g. switching the loader header from "Extracting frames" to
   * "Stabilizing frames" mid-way through the same backend call).
   * @param message - String with the new loading message
   */

  const onSetMessage = (message: string) => {
    dispatch(setMessage(message));
  };

  /**
   * Method to set the seeAll attribute to true.
   * seeAll corresponds to the eye in FormCrossSctions, Step 5.
   * When seeAll is true, the user can see all the cross sections.
   * By default is true
   */

  const onSetSeeAll = (value?: boolean) => {
    dispatch(setSeeAll(value));
  };

  /**
   * Method to set the screen sizes on the UI slice.
   * @param screen - Object with the screen sizes
   */

  interface SetScreen {
    windowWidth: number;
    windowHeight: number;
    imageWidth?: number;
    imageHeight?: number;
    vertical?: boolean;
  }

  const onSetScreen = (values: SetScreen) => {
    const { windowWidth, windowHeight, imageWidth, imageHeight } = values;

    if (imageWidth && imageHeight) {
      const result = getNewImageResolution(windowWidth, windowHeight, imageWidth, imageHeight);

      dispatch(
        setScreen({
          width: windowWidth,
          height: windowHeight,
          imageWidth: result.width,
          imageHeight: result.height,
          factor: result.factor,
          aspectRatio: imageWidth / imageHeight,
          vertical: result.vertical,
          heightReduced: result.heightReduced,
          widthReduced: result.widthReduced,
          factorReduced: result.factorReduced,
        })
      );
      return;
    }

    dispatch(setScreen({ width: windowWidth, height: windowHeight }));
  };

  const onSetLanguage = (language: string) => {
    dispatch(setLanguage(language));
  };

  /**
   * Shared hover-station bridge between the Results table (Grid.tsx) and the charts
   * (AllInOne.tsx/velocitySvg.ts) — hovering a row highlights the same station on the
   * charts and vice versa. Lives in Redux rather than React Context, matching how every
   * other piece of shared UI state in this app already works.
   */
  const onSetHoveredStation = (index: number | null) => {
    dispatch(setHoveredStation(index));
  };

  /**
   * Method to toggle the interrogation-window size preview on the Processing
   * image. Off by default (see uiSlice initial state).
   */
  const onSetShowInterrogationWindow = (value: boolean) => {
    dispatch(setShowInterrogationWindow(value));
  };

  const onCheckVersion = () => {
    // If isLatestVersion is already set, do not fetch the latest version
    if (isLatestVersion !== undefined) return;

    // Check if the current version is the latest version
    // Fetch the latest version from the GitHub API
    fetch('https://api.github.com/repos/oruscam/RIVeR/releases/latest').then(async (response) => {
      if (response.status === 200) {
        const data = await response.json();
        const latestVersion = data.tag_name.slice(1);
        const currentVersion = import.meta.env.VITE_APP_VERSION;

        dispatch(
          setIsLastVersion({
            isLatest: currentVersion === latestVersion,
            latest: latestVersion,
          })
        );
      }
    });
  };

  return {
    // ATTRIBUTES
    theme,
    darkMode,
    error,
    info,
    warning,
    isLoading,
    seeAll,
    screenSizes,
    message,
    language,
    isLatestVersion,
    latestVersion,
    hoveredStation,
    showInterrogationWindow,

    // METHODS
    onChangeTheme,
    onSetTheme,
    onSetErrorMessage,
    onSetInfoMessage,
    onSetWarningMessage,
    onClearWarningMessage,
    onSetMessage,
    onSetSeeAll,
    onSetScreen,
    onSetLanguage,
    onCheckVersion,
    onSetHoveredStation,
    onSetShowInterrogationWindow,
  };
};
