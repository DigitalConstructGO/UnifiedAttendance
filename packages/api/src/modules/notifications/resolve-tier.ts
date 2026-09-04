export type ResolvableTier = { threshold: number };

export function resolveNotificationTier<T extends ResolvableTier>(
  tiers: readonly T[],
  occurrenceCount: number,
): T | null {
  let best: T | null = null;
  for (const tier of tiers) {
    if (tier.threshold <= occurrenceCount && (best === null || tier.threshold > best.threshold)) {
      best = tier;
    }
  }
  return best;
}
