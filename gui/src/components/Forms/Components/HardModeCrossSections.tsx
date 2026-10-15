import { useSectionSlice } from '../../../hooks';
import { MaskCreation } from './MaskCreation';
import { PixelCoordinates } from './PixelCoordinates';
import { RealWorldCoordinates } from './RealWorldCoordinates';

export const HardModeCrossSections = ({ extraFields, name }: { extraFields: boolean; name: string }) => {
  const { onSetRealWorld, onSetDirPoints } = useSectionSlice();

  return (
    <div className={extraFields ? 'panel-advanced' : 'hidden'}>
      <hr className="panel-rule" />
      <RealWorldCoordinates section={name} step={4} onSetRealWorld={onSetRealWorld} showUnitLabel />

      <PixelCoordinates section={name} step={4} onSetDirPoints={onSetDirPoints} />
      <MaskCreation />
      <span id={`span-footer-${name}`} />
      <span id={`${name}-form-cross-section-footer`} />
    </div>
  );
};
