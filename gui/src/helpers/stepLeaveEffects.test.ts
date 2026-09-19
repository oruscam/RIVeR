import { applyStepLeaveEffects, getStepLeaveEffect } from './stepLeaveEffects';
import { MODULE_NUMBER } from '../constants/constants';

const handlers = () => ({
  onSetActiveSection: jest.fn(),
  onSetSeeAll: jest.fn(),
  onSetDefaultProjectState: jest.fn(),
});

describe('getStepLeaveEffect', () => {
  it('resets the active section to 0 when leaving Cross Sections', () => {
    const h = handlers();
    getStepLeaveEffect(MODULE_NUMBER.CROSS_SECTIONS, h)?.();
    expect(h.onSetActiveSection).toHaveBeenCalledWith(0);
    expect(h.onSetSeeAll).not.toHaveBeenCalled();
    expect(h.onSetDefaultProjectState).not.toHaveBeenCalled();
  });

  it('forces seeAll on when leaving Processing', () => {
    const h = handlers();
    getStepLeaveEffect(MODULE_NUMBER.PROCESSING, h)?.();
    expect(h.onSetSeeAll).toHaveBeenCalledWith(true);
    expect(h.onSetActiveSection).not.toHaveBeenCalled();
    expect(h.onSetDefaultProjectState).not.toHaveBeenCalled();
  });

  it('resets the whole project when leaving Video Range', () => {
    const h = handlers();
    getStepLeaveEffect(MODULE_NUMBER.VIDEO_RANGE, h)?.();
    expect(h.onSetDefaultProjectState).toHaveBeenCalled();
    expect(h.onSetActiveSection).not.toHaveBeenCalled();
    expect(h.onSetSeeAll).not.toHaveBeenCalled();
  });

  it('has no effect for a step with no special reset (Pixel Size, Results, Report)', () => {
    const h = handlers();
    expect(getStepLeaveEffect(MODULE_NUMBER.PIXEL_SIZE, h)).toBeUndefined();
    expect(getStepLeaveEffect(MODULE_NUMBER.RESULTS, h)).toBeUndefined();
    expect(getStepLeaveEffect(MODULE_NUMBER.REPORT, h)).toBeUndefined();
    expect(h.onSetActiveSection).not.toHaveBeenCalled();
    expect(h.onSetSeeAll).not.toHaveBeenCalled();
    expect(h.onSetDefaultProjectState).not.toHaveBeenCalled();
  });
});

describe('applyStepLeaveEffects', () => {
  it('applies every leave-effect from Results down through Video Range, in order, WITHOUT resetting the whole project', () => {
    const h = handlers();
    const order: string[] = [];
    h.onSetSeeAll.mockImplementation(() => order.push('seeAll'));
    h.onSetActiveSection.mockImplementation(() => order.push('activeSection'));
    h.onSetDefaultProjectState.mockImplementation(() => order.push('defaultProjectState'));

    applyStepLeaveEffects(MODULE_NUMBER.RESULTS, MODULE_NUMBER.VIDEO_RANGE, h);

    expect(order).toEqual(['seeAll', 'activeSection']);
    expect(h.onSetDefaultProjectState).not.toHaveBeenCalled();
  });

  it('applies only the Processing leave-effect when jumping from Results to Cross Sections', () => {
    const h = handlers();
    applyStepLeaveEffects(MODULE_NUMBER.RESULTS, MODULE_NUMBER.CROSS_SECTIONS, h);
    expect(h.onSetSeeAll).toHaveBeenCalledWith(true);
    expect(h.onSetActiveSection).not.toHaveBeenCalled();
    expect(h.onSetDefaultProjectState).not.toHaveBeenCalled();
  });

  it('applies no effects when target equals activeStep - 1 with no special step in between (Pixel Size to Video Range)', () => {
    const h = handlers();
    applyStepLeaveEffects(MODULE_NUMBER.PIXEL_SIZE, MODULE_NUMBER.VIDEO_RANGE, h);
    expect(h.onSetActiveSection).not.toHaveBeenCalled();
    expect(h.onSetSeeAll).not.toHaveBeenCalled();
    expect(h.onSetDefaultProjectState).not.toHaveBeenCalled();
  });
});
