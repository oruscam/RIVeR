const formatNumberToPrecision2 = (num: number) => {
  return parseFloat(num.toPrecision(4));
};

const formatNumberTo2Decimals = (num: number | undefined) => {
  if (num === undefined) return 0;
  return parseFloat(num.toFixed(2));
};

const formatNumberToPrecision4 = (num: number) => {
  return parseFloat(num.toPrecision(4));
};

export {
  formatNumberToPrecision4,
  formatNumberTo2Decimals,
  formatNumberToPrecision2,
};
