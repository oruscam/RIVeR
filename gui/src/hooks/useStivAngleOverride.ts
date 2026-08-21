import { useCallback, useEffect } from 'react';
import { useSectionSlice } from './useSectionSlice';
import { clearAllOverrides, clearOverride, hasAnyOverride, isStationTuned, setOverride } from '../helpers';

/** How long the disk write waits for the drag to settle. Long enough that a
 *  rotation costs one write instead of dozens, short enough that letting go of
 *  the mouse and pulling the plug is not a realistic way to lose an edit. */
const PERSIST_DELAY_MS = 300;

type PendingWrite = { timer: ReturnType<typeof setTimeout>; angles: (number | null)[] };

/**
 * Module-scoped, not per-hook-instance: `useStivAngleOverride` is called from
 * more than one component (the tuner, the viewer, the Reset-all button), and a
 * write must be flushable regardless of which instance scheduled it. Keyed by
 * section name so switching cross-sections mid-drag cannot cross-write.
 *
 * This is also what makes `flushStivAngleWrites` possible: Processing's "Next"
 * button re-reads xsections.json from disk before advancing to Results, and
 * that read must never race a write this feature itself just scheduled — see
 * flushStivAngleWrites below.
 */
const pending = new Map<string, PendingWrite>();

const schedulePersist = (sectionName: string, angles: (number | null)[]) => {
  const existing = pending.get(sectionName);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    pending.delete(sectionName);
    window.ipcRenderer.invoke('set-stiv-manual-angles', { sectionName, angles }).catch(() => {});
  }, PERSIST_DELAY_MS);
  pending.set(sectionName, { timer, angles });
};

/**
 * Flush every pending debounced angle write to disk immediately, awaiting each
 * one. Call this before any code path re-reads xsections.json — most notably
 * Processing's "Next" button, which replaces Redux's section data wholesale
 * from whatever is currently on disk (useDataSlice.ts's onLoadResultData). A
 * pending write that hadn't landed yet would otherwise be silently discarded
 * from the in-memory state at exactly the moment its effect is measured.
 */
export const flushStivAngleWrites = async (): Promise<void> => {
  const writes = Array.from(pending.entries());
  pending.clear();
  await Promise.all(
    writes.map(([sectionName, { timer, angles }]) => {
      clearTimeout(timer);
      return window.ipcRenderer.invoke('set-stiv-manual-angles', { sectionName, angles }).catch(() => {});
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
      const write = pending.get(sectionName);
      if (!write) return;
      pending.delete(sectionName);
      clearTimeout(write.timer);
      window.ipcRenderer.invoke('set-stiv-manual-angles', { sectionName, angles: write.angles }).catch(() => {});
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
