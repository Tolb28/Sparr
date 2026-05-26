export interface MetricComputationContext {
  metrics: Record<string, number>;
}

export interface MetricDefinition {
  key: string; // 'workouts_completed', 'skill_level', etc
  name: string; // Display name
  unit?: string; // 'workouts', 'hours', 'level'
  compute: (profileId: number, context?: MetricComputationContext) => Promise<number>;
  validate: (value: number) => boolean;
}

export const ALLOWED_RANGES = ['week', 'month', 'year', 'lifetime'] as const;
export type AllowedRange = (typeof ALLOWED_RANGES)[number];

export function validateProfileId(profileId: unknown): asserts profileId is number {
  if (!Number.isInteger(profileId) || (profileId as number) <= 0) {
    throw new Error('Invalid profile ID: must be positive integer');
  }
}

export function validateRange(range: unknown): asserts range is AllowedRange {
  if (typeof range !== 'string' || !ALLOWED_RANGES.includes(range as AllowedRange)) {
    throw new Error(`Invalid range: must be one of ${ALLOWED_RANGES.join(', ')}`);
  }
}
