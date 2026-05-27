const getPointNames = (mode: 'rw' | 'pixel', fields: number) => {
  const pointsNames = [];

  // Determine the prefix based on modeName
  const x = mode === 'rw' ? 'east' : 'x';
  const y = mode === 'rw' ? 'north' : 'y';

  for (let i = 1; i <= fields; i++) {
    const isPar = i % 2 === 0;
    const number = Math.ceil((i / 2))
    
    const name = `${!isPar ? x : y}Point${number}`;

    pointsNames.push(name);
  }

  return pointsNames  
};

const getFormStyle = (type: string, step: number, fields: number, index: number) => {
  let style = index >= fields / 2 ? 'green' : 'red';

  if (type === 'uav' && step === 3){
    style = '';
  } else if (type === 'oblique' && step === 3){
    style = index > 1  ? 'lightblue' : 'red';
  } else {
    style = index >= fields / 2 ? 'green' : 'red';
  }

  return style 
}


export { getPointNames, getFormStyle };