/**
 * @file useUiSlice.ts
 * @description This file contains the custom hook for the UI slice.
 */

import { useDispatch, useSelector } from 'react-redux';
import {
  changeTheme,
  setTheme,
  setModeHint,
  clearModeHint,
  setFieldError,
  clearFieldError,
  clearAllFieldErrors,
  addStepAlert,
  clearStepAlert,
  clearAllStepAlerts,
  showToast,
  clearToast,
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
    modeHint,
    fieldErrors,
    stepAlerts,
    toast,
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
   * Sets the persistent canvas-adjacent mode hint (e.g. "Drawing line",
   * "Editing mask 2"). Unlike the old warning/info bars, there is exactly one
   * mode hint at a time and it never auto-clears — the caller clears it
   * explicitly with onClearModeHint once the mode ends.
   * @param text - What mode the user is in.
   * @param meta - Optional short status alongside it (e.g. "1 of 2 min.").
   */
  const onSetModeHint = (text: string, meta?: string) => {
    dispatch(setModeHint({ text, meta }));
  };

  const onClearModeHint = () => {
    dispatch(clearModeHint());
  };

  /**
   * Sets the inline error for one named field. Persists until the field is
   * corrected (the caller clears it, usually right before re-validating).
   */
  const onSetFieldError = (name: string, message: string) => {
    dispatch(setFieldError({ name, message }));
  };

  const onClearFieldError = (name: string) => {
    dispatch(clearFieldError(name));
  };

  const onClearAllFieldErrors = () => {
    dispatch(clearAllFieldErrors());
  };

  /**
   * Adds (or replaces, by id) one step alert in the panel's alert list. Stays
   * until the caller clears that same id — typically when the condition that
   * raised it no longer holds.
   */
  const onAddStepAlert = (id: string, level: 'info' | 'warning' | 'error', text: string) => {
    dispatch(addStepAlert({ id, level, text }));
  };

  const onClearStepAlert = (id: string) => {
    dispatch(clearStepAlert(id));
  };

  const onClearAllStepAlerts = () => {
    dispatch(clearAllStepAlerts());
  };

  /**
   * Shows a toast for 4 seconds, then clears itself. A second call while one
   * is showing replaces it outright (one toast at a time), matching the
   * audit's "bottom of the window, 4 seconds" spec.
   * @param actionLabel - e.g. "Undo" — Toast.tsx renders it as a click target;
   *   the caller is responsible for what it does (see Task 12).
   */
  const onShowToast = (text: string, actionLabel?: string) => {
    dispatch(showToast({ text, actionLabel }));
    setTimeout(() => {
      dispatch(clearToast());
    }, 4000);
  };

  const onClearToast = () => {
    dispatch(clearToast());
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
    modeHint,
    fieldErrors,
    stepAlerts,
    toast,
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
    onSetModeHint,
    onClearModeHint,
    onSetFieldError,
    onClearFieldError,
    onClearAllFieldErrors,
    onAddStepAlert,
    onClearStepAlert,
    onClearAllStepAlerts,
    onShowToast,
    onClearToast,
    onSetMessage,
    onSetSeeAll,
    onSetScreen,
    onSetLanguage,
    onCheckVersion,
    onSetHoveredStation,
    onSetShowInterrogationWindow,
  };
};
