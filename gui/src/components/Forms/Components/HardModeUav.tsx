import { useEffect } from 'react';
import { useUavSlice } from '../../../hooks';
import { PixelCoordinates } from './PixelCoordinates';
import { RealWorldCoordinates } from './RealWorldCoordinates';

export const HardModeUav = () => {
  const { onSetPixelDirection, onSetPixelRealWorld } = useUavSlice();

  useEffect(() => {
    const element = document.getElementById('span-footer');
    element?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div id="hard-mode-uav">
      <RealWorldCoordinates step={3} onSetRealWorld={onSetPixelRealWorld} />
      <PixelCoordinates step={3} onSetDirPoints={onSetPixelDirection} />
      <span id="span-footer"></span>
    </div>
  );
};
