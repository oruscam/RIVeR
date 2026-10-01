import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { drone, ipcam, oblique } from '../assets/icons/icons';
import {
  FOOTAGE_LABELS,
  SHOWN_RECENT_PROJECTS,
  type FootageType,
  type RecentProject,
  formatOpenedDate,
  keepExisting,
  projectName,
  readRecentProjects,
  writeRecentProjects,
} from '../helpers/recentProjects';

const FOOTAGE_ICONS: Record<FootageType, string> = { uav: drone, oblique: oblique, ipcam: ipcam };

/**
 * Home's recent projects (spec §4/6f, amendment A14): up to three tiles, each
 * reopening its project with no folder picker. The stored list is checked
 * against the disk on mount and projects that no longer exist are dropped.
 * If that check itself fails, the stored list is shown as-is and left alone:
 * one failed IPC must not erase the history.
 */
export const RecentProjects = ({ onOpen }: { onOpen: (directory: string) => void }) => {
  const { t, i18n } = useTranslation();
  const [recents, setRecents] = useState<RecentProject[]>([]);

  useEffect(() => {
    let cancelled = false;
    const stored = readRecentProjects(localStorage);
    if (stored.length === 0) return;
    window.ipcRenderer
      .invoke(
        'projects-exist',
        stored.map((r) => r.directory)
      )
      .then((existing: string[]) => {
        if (cancelled) return;
        const kept = keepExisting(stored, existing);
        writeRecentProjects(localStorage, kept);
        setRecents(kept.slice(0, SHOWN_RECENT_PROJECTS));
      })
      .catch(() => {
        if (!cancelled) setRecents(stored.slice(0, SHOWN_RECENT_PROJECTS));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (recents.length === 0) return null;

  const now = Date.now();
  return (
    <section className="recents" aria-labelledby="recent-projects-title">
      <h2 className="recents-title" id="recent-projects-title">
        {t('MainPage.recentProjects', { defaultValue: 'Recent projects' })}
      </h2>
      <ul className="recents-grid">
        {recents.map((r) => (
          <li key={r.directory}>
            <button type="button" className="recent-tile" title={r.directory} onClick={() => onOpen(r.directory)}>
              <span className="recent-tile-icon" aria-hidden="true">
                <Icon path={FOOTAGE_ICONS[r.type]} />
              </span>
              <span className="recent-tile-text">
                <span className="recent-tile-name">{projectName(r.directory)}</span>
                <span className="recent-tile-meta">
                  {t('Step-2.footageType.' + r.type, { defaultValue: FOOTAGE_LABELS[r.type] })} ·{' '}
                  {formatOpenedDate(r.openedAt, now, i18n.language)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
