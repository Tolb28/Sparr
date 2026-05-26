import { ClubSessionsMetric } from './ClubSessionsMetric';
import { IntensityScoreMetric } from './IntensityScoreMetric';
import { InteractionsCountMetric } from './InteractionsCountMetric';
import { SkillLevelMetric } from './SkillLevelMetric';
import { StreakDaysMetric } from './StreakDaysMetric';
import { TotalHoursMetric } from './TotalHoursMetric';
import { WorkoutsCompletedMetric } from './WorkoutsCompletedMetric';
import { MetricDefinition } from './types';

export const METRICS: MetricDefinition[] = [
  WorkoutsCompletedMetric,
  TotalHoursMetric,
  StreakDaysMetric,
  ClubSessionsMetric,
  InteractionsCountMetric,
  SkillLevelMetric,
  IntensityScoreMetric,
];
