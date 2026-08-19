export type SpeedTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'none';

export interface CompletionScoringInput {
  timeSpentSec: number;
  estimatedMinutes: number;
  score: number;
  passingScore: number;
}

export interface CompletionScoringResult {
  points: number;
  speedTier: SpeedTier;
  timeRatio: number;
  speedMultiplier: number;
  scoreMultiplier: number;
}

const BASE_POINTS = 50;
const MIN_SPEED_MULTIPLIER = 0.5;
const MAX_SPEED_MULTIPLIER = 1.35;

export function calculateCompletionPoints(input: CompletionScoringInput): CompletionScoringResult {
  const { timeSpentSec, estimatedMinutes, score, passingScore } = input;

  if (score < passingScore) {
    return {
      points: 0,
      speedTier: 'none',
      timeRatio: Infinity,
      speedMultiplier: 0,
      scoreMultiplier: 0,
    };
  }

  const expectedSec = Math.max(estimatedMinutes * 60, 60);
  const actualSec = Math.max(timeSpentSec, 1);
  const timeRatio = actualSec / expectedSec;

  const speedMultiplier = Math.max(
    MIN_SPEED_MULTIPLIER,
    Math.min(MAX_SPEED_MULTIPLIER, MAX_SPEED_MULTIPLIER - timeRatio * 0.425),
  );

  const scoreRange = Math.max(100 - passingScore, 1);
  const scoreAbovePass = Math.min(100, score) - passingScore;
  const scoreMultiplier = 0.75 + 0.25 * Math.max(0, scoreAbovePass / scoreRange);

  const points = Math.round(BASE_POINTS * speedMultiplier * scoreMultiplier);

  let speedTier: SpeedTier = 'bronze';
  if (timeRatio <= 0.5) speedTier = 'platinum';
  else if (timeRatio <= 0.75) speedTier = 'gold';
  else if (timeRatio <= 1) speedTier = 'silver';

  return { points, speedTier, timeRatio, speedMultiplier, scoreMultiplier };
}

export function formatDurationShort(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

export function timeRatioPercent(timeSpentSec: number, estimatedMinutes: number): number {
  const expectedSec = Math.max(estimatedMinutes * 60, 60);
  return Math.round((timeSpentSec / expectedSec) * 100);
}
