import { ReactNode } from 'react';
import { IconType } from 'react-icons';

interface SuccessBannerProps {
  icon: IconType;
  title: string;
  compact?: boolean;
  children: ReactNode;
}

export const SuccessBanner = ({ icon: IconComponent, title, compact = false, children }: SuccessBannerProps) => {
  return (
    <div className={`success-banner${compact ? ' success-banner-compact' : ''}`}>
      <IconComponent className="success-banner-icon" size={compact ? 20 : 32} />
      <div className="success-banner-body">
        <p className="success-banner-title">{title}</p>
        <div className="success-banner-message">{children}</div>
      </div>
    </div>
  );
};
