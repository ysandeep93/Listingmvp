export const EXPIRY_DAYS = 7;

export interface FreshnessInfo {
  daysAgo: number;
  hoursAgo: number;
  label: string;
  isFresh: boolean; // ≤ 2 days (Green)
  isAmber: boolean; // 3 to 7 days (Amber)
  isExpired: boolean; // > 7 days
}

export function getFreshnessInfo(lastSeenAtStr: string): FreshnessInfo {
  const lastSeen = new Date(lastSeenAtStr).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - lastSeen);
  const hoursAgo = Math.floor(diffMs / (1000 * 60 * 60));
  const daysAgo = Math.floor(hoursAgo / 24);

  let label: string;
  if (hoursAgo < 1) {
    label = 'Seen just now';
  } else if (hoursAgo < 24) {
    label = `Seen ${hoursAgo}h ago`;
  } else if (daysAgo === 1) {
    label = 'Seen yesterday';
  } else {
    label = `Seen ${daysAgo}d ago`;
  }

  const isExpired = daysAgo >= EXPIRY_DAYS;
  const isFresh = daysAgo < 2;
  const isAmber = daysAgo >= 2 && !isExpired;

  return {
    daysAgo,
    hoursAgo,
    label,
    isFresh,
    isAmber,
    isExpired,
  };
}

export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return 'Contact board';
  return '₹' + amount.toLocaleString('en-IN');
}
