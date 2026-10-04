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
  videoFolderName,
  writeRecentProjects,
} from '../helpers/recentProjects';

const FOOTAGE_ICONS: Record<FootageType, string> = { uav: drone, oblique: oblique, ipcam: ipcam };

/**
 * Home's recent projects (spec §4/6f, amendment A14): up to three tiles, each
 * reopening its project with no folder picker. The stored list is checked
 * against the disk on mount and projects that no longer exist are dropped.
 * If that check itself fails, the stored list is shown as-is and left alone:
 * one failed IPC must not erase the history.
 *
 * Each tile shows a miniature of the project's first frame once the main
 * process has made one; until then, or without frames, the footage icon stays.
 */
export const RecentProjects = ({ onOpen }: { onOpen: (directory: string) => void }) => {
  const { t, i18n } = useTranslation();
  const [recents, setRecents] = useState<RecentProject[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

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

  useEffect(() => {
    if (recents.length === 0) return;
    let cancelled = false;
    const dirs = recents.map((r) => r.directory);
    window.ipcRenderer
      .invoke('project-thumbnails', dirs)
      .then((urls: string[]) => {
        if (cancelled) return;
        setThumbnails(Object.fromEntries(dirs.map((d, i) => [d, urls[i] ?? ''])));
      })
      .catch(() => {
        // A missing miniature just leaves the footage icon in place.
      });
    return () => {
      cancelled = true;
    };
  }, [recents]);

  if (recents.length === 0) return null;

  const now = Date.now();
  return (
    <section className="recents" aria-labelledby="recent-projects-title">
      <h2 className="recents-title" id="recent-projects-title">
        {t('MainPage.recentProjects', { defaultValue: 'Recent projects' })}
      </h2>
      <ul className="recents-grid">
        {recents.map((r) => {
          // Project folders are timestamps; the video folder above them is
          // what tells two tiles apart, so it leads and the timestamp follows.
          const video = videoFolderName(r.directory);
          const project = projectName(r.directory);
          const thumbnail = thumbnails[r.directory];
          return (
            <li key={r.directory}>
              <button
                type="button"
                className="recent-tile"
                title={r.directory}
                onClick={() => onOpen(r.directory)}
              >
                <span className="recent-tile-icon" aria-hidden="true">
                  <Icon path={FOOTAGE_ICONS[r.type]} />
                  {thumbnail && (
                    <img
                      className="recent-tile-thumb"
                      src={thumbnail}
                      alt=""
                      onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
                    />
                  )}
                </span>
                <span className="recent-tile-text">
                  <span className="recent-tile-name">{video || project}</span>
                  {video && <span className="recent-tile-project">{project}</span>}
                  <span className="recent-tile-meta">
                    {t('Step-2.footageType.' + r.type, { defaultValue: FOOTAGE_LABELS[r.type] })} ·{' '}
                    {formatOpenedDate(r.openedAt, now, i18n.language)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
