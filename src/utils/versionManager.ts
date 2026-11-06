/**
 * J.A.R.V.I.S. Automatic Version Management Client Utility
 * Synchronizes with /api/version/* to:
 * - Track current app semantic version (vX.Y.Z)
 * - Display exact real system Last Updated date & time (never hardcoded)
 * - Detect when a newer version or staged release is available
 * - Manage release history and Admin Update Panel operations
 */

export type VersionBumpType = 'PATCH' | 'MINOR' | 'MAJOR';

export interface VersionReleaseRecord {
  id: string;
  version: string;
  displayVersion: string;
  previousVersion: string;
  bumpType: VersionBumpType;
  title: string;
  releaseNotes: string[];
  releasedAt: string; // Real system ISO timestamp
  releasedBy: string;
  filesModified: string[];
  backupId: string;
  buildSha256: string;
}

export interface StagedUpdateInfo {
  id: string;
  targetVersion: string;
  displayVersion: string;
  bumpType: VersionBumpType;
  title: string;
  releaseNotes: string[];
  stagedAt: string; // Real system ISO timestamp
  stagedBy: string;
}

export interface VersionStatusPayload {
  currentVersion: string;
  displayVersion: string;
  packageJsonVersion: string;
  lastUpdatedIso: string;
  filesystemLatestMtimeIso: string;
  mostRecentlyModifiedFile: string;
  serverSystemTimeIso: string;
  codebaseSha256: string;
  updateAvailable: boolean;
  updateReason: string | null;
  availableVersion: string | null;
  stagedUpdate: StagedUpdateInfo | null;
  releaseHistory: VersionReleaseRecord[];
}

export function compareSemVer(vA: string, vB: string): number {
  const cleanA = vA.replace(/[^0-9.]/g, '').split('.').map((n) => parseInt(n, 10) || 0);
  const cleanB = vB.replace(/[^0-9.]/g, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const a = cleanA[i] || 0;
    const b = cleanB[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

export function formatExactSystemTimestamp(isoString: string | null | undefined): {
  localFull: string;
  utcFull: string;
  relative: string;
} {
  if (!isoString) {
    return {
      localFull: 'Synchronizing system clock...',
      utcFull: 'UTC --',
      relative: 'Live',
    };
  }
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return {
      localFull: isoString,
      utcFull: isoString,
      relative: 'Verified',
    };
  }

  const localFull = date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const utcFull = date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  let relative = 'Just now';
  if (diffSeconds >= 86400) {
    relative = `${Math.floor(diffSeconds / 86400)}d ago`;
  } else if (diffSeconds >= 3600) {
    relative = `${Math.floor(diffSeconds / 3600)}h ${Math.floor((diffSeconds % 3600) / 60)}m ago`;
  } else if (diffSeconds >= 60) {
    relative = `${Math.floor(diffSeconds / 60)}m ${diffSeconds % 60}s ago`;
  } else if (diffSeconds > 2) {
    relative = `${diffSeconds}s ago`;
  }

  return { localFull, utcFull, relative };
}
