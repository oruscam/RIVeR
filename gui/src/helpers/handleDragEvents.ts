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

  // Only clear drag state when the cursor leaves the container entirely.
  // Without this check, dragleave fires on every child element transition,
  // causing the highlight to flicker.
  if (e.currentTarget.contains(e.relatedTarget as Node)) return;

  if (nullType) {
    setDragOver(null);
  } else {
    setDragOver(false);
  }
  return;
};

export { handleDragOver, handleDragLeave };
