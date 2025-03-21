/**
 * Transform a date string to a readable format
 * 2022-10-30T10:25:00.000Z -> 30/10/2022 10:25
 * @param dateString
 * @returns
 */

export const adaptStringDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

export const recortStringDate = (dateString: string): string => {
  const [datePart] = dateString.split(" ");

  return datePart;
};

/**
 * Converts a Date object to a string representation of the date and time.
 *
 * @param date - The Date object to convert.
 * @returns A string representation of the date and time in the format "dd/mm/yyyy hh:mm".
 */
export const dateToStringDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

export const stringDateToDate = (dateString: string): Date => {
  // Divide la cadena en fecha y hora
  const [datePart, timePart] = dateString.split(" ");

  // Divide la fecha en día, mes y año
  const [day, month, year] = datePart.split("/");

  // Reordena la fecha al formato YYYY-MM-DD
  const formattedDate = `${year}-${month}-${day}`;

  // Combina la fecha y la hora
  const dateTimeString = `${formattedDate}T${timePart}:00`;

  // Crea el objeto Date
  return new Date(dateTimeString);
};
