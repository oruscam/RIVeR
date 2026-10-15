type Footage = 'uav' | 'oblique' | 'ipcam' | '';

const DRAWINGS: Record<Exclude<Footage, ''>, React.ReactNode> = {
  uav: (
    <>
      <circle cx="5.5" cy="5.5" r="3" />
      <circle cx="18.5" cy="5.5" r="3" />
      <circle cx="5.5" cy="18.5" r="3" />
      <circle cx="18.5" cy="18.5" r="3" />
      <path d="M7.8 7.8l2.2 2.2M16.2 7.8 14 10M7.8 16.2l2.2-2.2M16.2 16.2 14 14" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1.2" />
    </>
  ),
  oblique: (
    <>
      <rect x="5" y="2.5" width="14" height="8.5" rx="1.8" />
      <circle cx="12" cy="6.75" r="2.1" />
      <path d="M12 11v3.2M12 14.2 6.5 21.5M12 14.2l5.5 7.3M12 14.2v7.3" />
    </>
  ),
  ipcam: (
    <>
      <path d="M16.75 12h3.632a1 1 0 0 1 .894 1.447l-2.034 4.069a1 1 0 0 1-1.708.134l-2.124-2.97" />
      <path d="M17.106 9.053a1 1 0 0 1 .447 1.341l-3.106 6.211a1 1 0 0 1-1.342.447L3.61 12.3a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3z" />
      <path d="M2 19h3.76a2 2 0 0 0 1.8-1.1L9 15" />
      <path d="M2 21v-4" />
      <path d="M7 9h.01" />
    </>
  ),
};

/** The footage-picker line icons, inline so the exported report stays one self-contained file. */
export const FootageIcon = ({ type, className = '' }: { type: Footage; className?: string }) =>
  type === '' ? null : (
    <svg
      className={`doc-ficon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {DRAWINGS[type]}
    </svg>
  );
