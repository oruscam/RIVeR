const formatNumberToPrecision2 = (num: number) => {
    return parseFloat(num.toPrecision(2));
};

const formatNumberTo2Decimals = (num: number | undefined ) => {
    if ( num === undefined ) return 0;
    return parseFloat(num.toFixed(2));
}


export { formatNumberToPrecision2, formatNumberTo2Decimals };