import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface SuccessBannerProps {
  icon: LucideIcon;
  title: string;
  compact?: boolean;
  children: ReactNode;
}

export const SuccessBanner = ({ icon: IconComponent, title, compact = false, children }: SuccessBannerProps) => {
  return (
    <div className={`success-banner${compact ? ' success-banner-compact' : ''}`}>
      <IconComponent className="success-banner-icon" aria-hidden="true" />
      <div className="success-banner-body">
        <h3 className="success-banner-title">{title}</h3>
        <div className="success-banner-message">{children}</div>
      </div>
    </div>
  );
};
