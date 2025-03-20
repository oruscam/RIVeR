/**
 * @fileoverview Helper functions to validate strings with regex.
 */

/**
 * Function to compare if a string section is valid for section name.
 * Can't have special characters.
 * @param input | string
 * @returns boolean
 */

export const isValidString = (input: string): boolean => {
  const regex = /^[a-zA-Z0-9_]*$/;
  return regex.test(input);
};
