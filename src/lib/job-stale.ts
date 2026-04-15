const STALE_PENDING_DAYS = 7;
const STALE_REVIEW_DAYS = 14;
const STALE_PROCESSING_HOURS = 4; // shouldn't be processing for more than 4 hours

export interface StaleResult {
  isStale: boolean;
  reason?: string;
  daysOld?: number;
}

export function checkStale(opts: {
  status: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}): StaleResult {
  const now = Date.now();
  const created = new Date(opts.createdAt).getTime();
  const updated = opts.updatedAt ? new Date(opts.updatedAt).getTime() : created;

  const daysOld = Math.floor((now - created) / (24 * 60 * 60 * 1000));

  if (opts.status === "pending" && daysOld >= STALE_PENDING_DAYS) {
    return { isStale: true, reason: `Pending for ${daysOld} days — start or delete`, daysOld };
  }
  if (opts.status === "review" && daysOld >= STALE_REVIEW_DAYS) {
    return { isStale: true, reason: `Awaiting review for ${daysOld} days`, daysOld };
  }
  if (opts.status === "processing") {
    const hoursOld = Math.floor((now - updated) / (60 * 60 * 1000));
    if (hoursOld >= STALE_PROCESSING_HOURS) {
      return { isStale: true, reason: `Processing stuck for ${hoursOld}h — admin should investigate`, daysOld };
    }
  }

  return { isStale: false };
}
