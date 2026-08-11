import './components.css';

interface FocusOverlayProps {
  active: boolean;
}

export const FocusOverlay = ({ active }: FocusOverlayProps) => {
  return <div className={`focus-overlay ${active ? 'focus-overlay-active' : ''}`} />;
};
