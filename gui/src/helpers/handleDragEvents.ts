const handleDragOver = (e: React.DragEvent<HTMLDivElement>, setDragOver: (value: any) => void, id?: string) => {
  e.preventDefault();
  if (id) {
    setDragOver(id);
  } else {
    setDragOver(true);
  }
  return;
};

const handleDragLeave = (
  e: React.DragEvent<HTMLDivElement>,
  setDragOver: (value: any) => void,
  nullType: boolean
) => {
  e.preventDefault();

  if (nullType) {
    setDragOver(null);
  } else {
    setDragOver(false);
  }
  return;
};

export { handleDragOver, handleDragLeave };
