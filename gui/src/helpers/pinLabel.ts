export interface BankLabels {
  left: string;
  right: string;
}

/**
 * The letter on a section pin's head. Cross sections name the banks by the
 * language's own hydrology initial (CrossSections.bankLeft / bankRight: I/D in
 * Spanish, G/D in French, 左/右 in Japanese); UAV pixel-size pins are the
 * digits 1 and 2 in every language.
 */
export const resolvePinLabel = (module: string, type: 'L' | 'R', bankLabels?: BankLabels): string => {
  if (module === 'uav') return type === 'L' ? '1' : '2';
  return type === 'L' ? (bankLabels?.left ?? 'L') : (bankLabels?.right ?? 'R');
};
