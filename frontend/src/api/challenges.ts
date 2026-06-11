import { buildAuthHeaders } from './profile';
import { ServerIP } from './tokenHandler';

export type ChallengeStatus = 'not_started' | 'in_progress' | 'completed';
export type ChallengeRequirementSource = 'manual' | 'auto';

export interface ChallengeBadge {
  id_badges: number;
  title: string;
  description?: string;
  icon_name: string;
  color: string;
  earned: boolean;
}

export interface ChallengeRequirement {
  id_challenge_requirements: number;
  requirement_key: string;
  title: string;
  unit: string;
  target_value: number;
  current_value: number;
  source: ChallengeRequirementSource;
  auto_metric_key?: string | null;
  is_complete: boolean;
}

export interface ChallengeSummary {
  id_challenges: number;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  status: ChallengeStatus;
  progress: number;
  started_at?: string | null;
  completed_at?: string | null;
  requirements: ChallengeRequirement[];
  badge: ChallengeBadge | null;
}

interface ChallengeActionResponse {
  challenge: ChallengeSummary;
  newly_awarded_badge?: ChallengeBadge | null;
}

const useMockChallenges = String(process.env.EXPO_PUBLIC_USE_CHALLENGE_MOCK || '').toLowerCase() === 'true';

const mockChallengesState: ChallengeSummary[] = [
  {
    id_challenges: 1,
    slug: 'mike-tyson-iron-circuit',
    title: 'Mike Tyson Workout Challenge',
    description:
      'A legendary volume challenge inspired by old-school grind: complete all targets and unlock the Tyson badge.',
    difficulty: 'advanced',
    status: 'not_started',
    progress: 0,
    started_at: null,
    completed_at: null,
    badge: {
      id_badges: 99001,
      title: 'Tyson Iron Badge',
      description: 'Awarded for finishing the Mike Tyson Workout Challenge.',
      icon_name: 'flame-outline',
      color: '#ef4444',
      earned: false,
    },
    requirements: [
      {
        id_challenge_requirements: 101,
        requirement_key: 'squats',
        title: 'Squats',
        unit: 'reps',
        target_value: 2000,
        current_value: 0,
        source: 'manual',
        is_complete: false,
      },
      {
        id_challenge_requirements: 102,
        requirement_key: 'situps',
        title: 'Sit-ups',
        unit: 'reps',
        target_value: 2000,
        current_value: 0,
        source: 'manual',
        is_complete: false,
      },
      {
        id_challenge_requirements: 103,
        requirement_key: 'pushups',
        title: 'Pushups',
        unit: 'reps',
        target_value: 500,
        current_value: 0,
        source: 'manual',
        is_complete: false,
      },
      {
        id_challenge_requirements: 104,
        requirement_key: 'bench_dips',
        title: 'Bench Dips',
        unit: 'reps',
        target_value: 500,
        current_value: 0,
        source: 'manual',
        is_complete: false,
      },
      {
        id_challenge_requirements: 105,
        requirement_key: 'barbell_shrugs',
        title: 'Barbell Shrugs',
        unit: 'reps',
        target_value: 500,
        current_value: 0,
        source: 'manual',
        is_complete: false,
      },
      {
        id_challenge_requirements: 106,
        requirement_key: 'wrestler_bridges',
        title: 'Wrestler Bridges',
        unit: 'minutes',
        target_value: 20,
        current_value: 0,
        source: 'manual',
        is_complete: false,
      },
    ],
  },
  {
    id_challenges: 2,
    slug: 'consistency-starter-14',
    title: 'Consistency Starter (14 Sessions)',
    description:
      'Build consistency by completing 14 workouts. Session count is automatically tracked.',
    difficulty: 'beginner',
    status: 'not_started',
    progress: 0,
    started_at: null,
    completed_at: null,
    badge: {
      id_badges: 99002,
      title: 'Consistency Starter Badge',
      description: 'Awarded for completing 14 sessions.',
      icon_name: 'calendar-outline',
      color: '#22c55e',
      earned: false,
    },
    requirements: [
      {
        id_challenge_requirements: 201,
        requirement_key: 'sessions_completed',
        title: 'Workout Sessions Completed',
        unit: 'sessions',
        target_value: 14,
        current_value: 0,
        source: 'auto',
        auto_metric_key: 'workouts_completed',
        is_complete: false,
      },
    ],
  },
];

function cloneMockState() {
  return JSON.parse(JSON.stringify(mockChallengesState)) as ChallengeSummary[];
}

function recalculateMockChallenge(challenge: ChallengeSummary) {
  const requirements = challenge.requirements.map((requirement) => {
    const currentValue = Math.max(0, Number(requirement.current_value ?? 0));
    const targetValue = Math.max(1, Number(requirement.target_value ?? 1));
    return {
      ...requirement,
      current_value: currentValue,
      is_complete: currentValue >= targetValue,
    };
  });

  challenge.requirements = requirements;

  const targetTotal = requirements.reduce((sum, requirement) => sum + Number(requirement.target_value || 0), 0);
  const currentTotal = requirements.reduce(
    (sum, requirement) => sum + Math.min(Number(requirement.current_value || 0), Number(requirement.target_value || 0)),
    0
  );
  challenge.progress = targetTotal > 0 ? currentTotal / targetTotal : 0;

  const allComplete = requirements.length > 0 && requirements.every((requirement) => requirement.is_complete);
  if (allComplete) {
    challenge.status = 'completed';
    challenge.completed_at = challenge.completed_at || new Date().toISOString();
    if (challenge.badge) {
      challenge.badge.earned = true;
    }
    return;
  }

  if (challenge.status !== 'not_started') {
    challenge.status = 'in_progress';
  }
}

function findMockChallenge(challengeId: number) {
  const challenge = mockChallengesState.find((item) => item.id_challenges === challengeId);
  if (!challenge) {
    throw new Error('Challenge not found');
  }
  return challenge;
}

async function authFetch(path: string, opts: RequestInit = {}) {
  const { headers: _ignored, ...restOpts } = opts;
  const response = await fetch(`${ServerIP}${path}`, {
    method: opts.method || 'GET',
    ...restOpts,
    headers: await buildAuthHeaders({ 'Content-Type': 'application/json' }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || errorData?.error || 'Request failed');
  }

  return response.json().catch(() => ({}));
}

export async function listChallenges(): Promise<ChallengeSummary[]> {
  if (useMockChallenges) {
    return cloneMockState();
  }
  const data = await authFetch('/auth/gamification/challenges');
  return Array.isArray(data?.challenges) ? data.challenges : [];
}

export async function getChallengeDetails(challengeId: number): Promise<ChallengeSummary | null> {
  if (useMockChallenges) {
    const challenge = mockChallengesState.find((item) => item.id_challenges === challengeId) || null;
    return challenge ? (JSON.parse(JSON.stringify(challenge)) as ChallengeSummary) : null;
  }
  const data = await authFetch(`/auth/gamification/challenges/${challengeId}`);
  return data?.challenge ?? null;
}

export async function startChallenge(challengeId: number): Promise<ChallengeActionResponse> {
  if (useMockChallenges) {
    const challenge = findMockChallenge(challengeId);
    if (challenge.status === 'not_started') {
      challenge.status = 'in_progress';
      challenge.started_at = challenge.started_at || new Date().toISOString();
    }
    recalculateMockChallenge(challenge);
    return {
      challenge: JSON.parse(JSON.stringify(challenge)),
      newly_awarded_badge: null,
    };
  }
  return authFetch(`/auth/gamification/challenges/${challengeId}/start`, { method: 'POST' });
}

export async function logChallengeProgress(
  challengeId: number,
  payload: { requirement_id: number; increment: number }
): Promise<ChallengeActionResponse> {
  if (useMockChallenges) {
    const challenge = findMockChallenge(challengeId);
    if (challenge.status === 'not_started') {
      challenge.status = 'in_progress';
      challenge.started_at = challenge.started_at || new Date().toISOString();
    }
    const requirement = challenge.requirements.find((item) => item.id_challenge_requirements === payload.requirement_id);
    if (!requirement) {
      throw new Error('Requirement not found');
    }
    if (requirement.source !== 'manual') {
      throw new Error('This requirement is tracked automatically');
    }
    requirement.current_value = Math.max(0, Number(requirement.current_value || 0) + Math.max(0, Number(payload.increment || 0)));
    const wasCompleted = challenge.status === 'completed';
    recalculateMockChallenge(challenge);
    const awardedNow = !wasCompleted && challenge.status === 'completed' ? challenge.badge : null;
    return {
      challenge: JSON.parse(JSON.stringify(challenge)),
      newly_awarded_badge: awardedNow ? (JSON.parse(JSON.stringify(awardedNow)) as ChallengeBadge) : null,
    };
  }
  return authFetch(`/auth/gamification/challenges/${challengeId}/progress`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function completeChallenge(challengeId: number): Promise<ChallengeActionResponse> {
  if (useMockChallenges) {
    const challenge = findMockChallenge(challengeId);
    recalculateMockChallenge(challenge);
    if (challenge.status !== 'completed') {
      throw new Error('Challenge requirements are not complete yet');
    }
    return {
      challenge: JSON.parse(JSON.stringify(challenge)),
      newly_awarded_badge: challenge.badge ? (JSON.parse(JSON.stringify(challenge.badge)) as ChallengeBadge) : null,
    };
  }
  return authFetch(`/auth/gamification/challenges/${challengeId}/complete`, { method: 'POST' });
}

