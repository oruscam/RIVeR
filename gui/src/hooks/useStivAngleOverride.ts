import { useCallback, useEffect } from 'react';
import { useSectionSlice } from './useSectionSlice';
import { clearAllOverrides, clearOverride, hasAnyOverride, isStationTuned, setOverride } from '../helpers';

/** How long the disk write waits for the drag to settle. Long enough that a
 *  rotation costs one write instead of dozens, short enough that letting go of
 *  the mouse and pulling the plug is not a realistic way to lose an edit. */
const PERSIST_DELAY_MS = 300;

type PendingWrite = {
  timer: ReturnType<typeof setTimeout> | null;
  angles: (number | null)[];
  /** The tail of this section's write chain: resolves once every write queued
   *  for this section so far — including one just sent — has settled on disk.
   *  Writes for one section are chained strictly in order, so there is never
   *  more than one in-flight IPC call per section, and a write can never be
   *  retired by an older write's completion racing a newer one. */
  chain: Promise<void>;
};

/**
 * Module-scoped, not per-hook-instance: this hook is called from more than one
 * component (the tuner, the viewer, the Reset-all button), and a write must be
 * flushable regardless of which instance scheduled it. Keyed by section name so
 * switching cross-sections mid-edit cannot cross-write.
 *
 * An entry lives from the moment a write is scheduled until the moment it has
 * settled on disk AND nothing newer has been queued behind it. Anything that
 * re-reads xsections.json (Processing's Next, via flushStivAngleWrites) has to
 * be able to wait for a write that is already away, or it reads the file as it
 * was before.
 */
const pending = new Map<string, PendingWrite>();

/**
 * Enqueues a write for `sectionName`, chained after whatever is already queued
 * for that section — so IPC calls for one section are strictly sequential and
 * never race each other on the file's unlocked read-modify-write. Retires the
 * entry once this write (and everything chained before it) has settled, but
 * only if the chain hasn't moved on since — a still-live timer means a newer
 * edit is queued behind this one and the entry must survive for it.
 */
const sendWrite = (sectionName: string, angles: (number | null)[]): Promise<void> => {
  const existing = pending.get(sectionName);
  const priorChain = existing?.chain ?? Promise.resolve();
  const chain: Promise<void> = priorChain
    .then(() => window.ipcRenderer.invoke('set-stiv-manual-angles', { sectionName, angles }))
    .then(
      () => {},
      (err) => console.error('set-stiv-manual-angles failed', err)
    );
  pending.set(sectionName, { timer: existing?.timer ?? null, angles, chain });
  chain.then(() => {
    const current = pending.get(sectionName);
    if (current?.chain === chain && !current.timer) pending.delete(sectionName);
  });
  return chain;
};

const schedulePersist = (sectionName: string, angles: (number | null)[]) => {
  const existing = pending.get(sectionName);
  if (existing?.timer) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    const entry = pending.get(sectionName);
    if (entry) entry.timer = null;
    sendWrite(sectionName, angles);
  }, PERSIST_DELAY_MS);
  pending.set(sectionName, { timer, angles, chain: existing?.chain ?? Promise.resolve() });
};

/**
 * Settle every angle write — scheduled or already away — before the caller reads
 * xsections.json back. Processing's Next button calls this ahead of
 * onLoadResultData, which replaces Redux's section data wholesale from disk.
 */
export const flushStivAngleWrites = async (): Promise<void> => {
  const entries = Array.from(pending.entries());
  await Promise.all(
    entries.map(([sectionName, entry]) => {
      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = null;
        return sendWrite(sectionName, entry.angles);
      }
      return entry.chain;
    })
  );
};

/**
 * Reads and writes one station's manual STIV angle.
 *
 * Writes go to Redux first so the UI (and the live discharge that follows from
 * it) updates on the same frame as the drag, then to disk. A failed write leaves
 * the session correct and only loses persistence, which is the right way round:
 * blocking the drag on a file write would make rotation feel broken.
 *
 * Only the disk half is debounced. The IPC handler does a full read-modify-write
 * of xsections.json and a drag can call this sixty times a second; those handlers
 * are concurrent with no lock, so besides the churn, an out-of-order completion
 * could leave a stale angle as the last thing written. Coalescing to the final
 * value removes both problems at once.
 */
export const useStivAngleOverride = (stationIndex: number) => {
  const { sections, activeSection, onChangeSectionData } = useSectionSlice();
  const section = sections[activeSection];
  const data = section?.data;

  // Unmounting (leaving the STI view; switching stations does not remount)
  // must not swallow an edit made in the last few hundred milliseconds. The
  // module-level map means this flushes whatever is pending for THIS
  // section specifically, regardless of which component instance scheduled it.
  useEffect(() => {
    const sectionName = section?.name;
    return () => {
      if (sectionName === undefined) return;
      const entry = pending.get(sectionName);
      if (!entry?.timer) return;
      clearTimeout(entry.timer);
      entry.timer = null;
      sendWrite(sectionName, entry.angles);
    };
  }, [section?.name]);

  const manual = data?.stiv_angle_manual_profile;
  const n = data?.stiv_angle_profile?.length ?? 0;
  const autoAngle = data?.stiv_angle_profile?.[stationIndex] ?? null;
  const isTuned = isStationTuned(manual, stationIndex);
  const angle = isTuned ? (manual as number[])[stationIndex] : autoAngle;

  const persist = useCallback(
    (angles: (number | null)[]) => {
      if (!data || !section) return;
      onChangeSectionData({ ...data, stiv_angle_manual_profile: angles });
      schedulePersist(section.name, angles);
    },
    [data, section, onChangeSectionData]
  );

  return {
    manual,
    autoAngle,
    angle,
    isTuned,
    hasAny: hasAnyOverride(manual),
    setAngle: (deg: number) => persist(setOverride(manual, stationIndex, deg, n)),
    reset: () => persist(clearOverride(manual, stationIndex, n)),
    resetAll: () => persist(clearAllOverrides(n)),
  };
};
