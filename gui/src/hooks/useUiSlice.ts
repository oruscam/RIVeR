/**
 * @file useUiSlice.ts
 * @description This file contains the custom hook for the UI slice.
 */

import { useDispatch, useSelector } from "react-redux";
import {
  changeTheme,
  setErrorMessage,
  clearErrorMessage,
  setSeeAll,
  setScreen,
  setLanguage,
  setIsLastVersion,
} from "../store/ui/uiSlice";
import { RootState } from "../store/store";
import { getNewImageResolution } from "../helpers";

/**
 * @returns - Object with the methods and attributes to interact with the ui slice
 */

export const useUiSlice = () => {
  const { darkMode, error, isLoading, seeAll, screenSizes, message, language, isLatestVersion, latestVersion } =
    useSelector((state: RootState) => state.ui);
  const dispatch = useDispatch();

  /**
   * Method to change the theme of the application
   */

  const onChangeTheme = () => {
    dispatch(changeTheme());
  };

  /**
   * Method to set the error message on the UI slice.
   * After 4 seconds the error message will be cleared.
   * @param error - String with the error message
   * @param error - Object with the error message
   */

  const onSetErrorMessage = (
    error: Record<string, { type: string; message: string }> | string,
  ) => {
    if (typeof error === "string") {
      dispatch(setErrorMessage([error]));
    } else {
      let arrayOfErrors: string[] = [];
      if (error !== undefined) {
        Object.entries(error).every(([, value]) => {
          if (typeof value === "string") {
            arrayOfErrors.push(value);
          } else if (value && value.type === "required") {
            arrayOfErrors = [value.message];
            return false;
          } else if (value) {
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
   * Method to set the seeAll attribute to true.
   * seeAll corresponds to the eye in FormCrossSctions, Step 5.
   * When seeAll is true, the user can see all the cross sections.
   * By default is true
   */

  const onSetSeeAll = ( value?: boolean) => {
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
  }

  const onSetScreen = (values: SetScreen) => {
    const { windowWidth, windowHeight, imageWidth, imageHeight } = values;

    if (imageWidth && imageHeight) {
      const result = getNewImageResolution(
        windowWidth,
        windowHeight,
        imageWidth,
        imageHeight,
      );
      dispatch(
        setScreen({
          width: windowWidth,
          height: windowHeight,
          imageWidth: result.width,
          imageHeight: result.height,
          factor: result.factor,
          aspectRatio: imageWidth / imageHeight,
        }),
      );
      return;
    }

    dispatch(setScreen({ width: windowWidth, height: windowHeight }));
  };

  const onSetLanguage = (language: string) => {
    dispatch(setLanguage(language));
  };

  const onCheckVersion = () => {
    // If isLatestVersion is already set, do not fetch the latest version
    if ( isLatestVersion !== undefined) return;

    // Check if the current version is the latest version
    // Fetch the latest version from the GitHub API
    fetch("https://api.github.com/repos/oruscam/RIVeR/releases/latest").then(async (response) => {
      if (response.status === 200) {
        const data = await response.json();
        const latestVersion = data.tag_name.slice(1);
        const currentVersion = import.meta.env.VITE_APP_VERSION;

        dispatch(setIsLastVersion({
          isLatest: currentVersion === latestVersion,
          latest: latestVersion,
        }));
      }
    })
  }

  return {
    // ATRIBUTES
    darkMode,
    error,
    isLoading,
    seeAll,
    screenSizes,
    message,
    language,
    isLatestVersion,
    latestVersion,

    // METHODS
    onChangeTheme,
    onSetErrorMessage,
    onSetSeeAll,
    onSetScreen,
    onSetLanguage,
    onCheckVersion,
  };
};
