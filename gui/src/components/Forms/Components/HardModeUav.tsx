import { useEffect } from 'react';
import { useUavSlice } from '../../../hooks';
import { PixelCoordinates } from './PixelCoordinates';
import { RealWorldCoordinates } from './RealWorldCoordinates';
import { scrollBehavior } from '../../../helpers/motion';

export const HardModeUav = () => {
  const { onSetPixelDirection, onSetPixelRealWorld } = useUavSlice();

  useEffect(() => {
    const element = document.getElementById('span-footer');
    element?.scrollIntoView({ behavior: scrollBehavior() });
  }, []);

  return (
    <div id="hard-mode-uav" className="panel-advanced">
      <hr className="panel-rule" />
      <RealWorldCoordinates step={3} onSetRealWorld={onSetPixelRealWorld} showUnitLabel />
      <PixelCoordinates step={3} onSetDirPoints={onSetPixelDirection} />
      <span id="span-footer"></span>
    </div>
  );
};
