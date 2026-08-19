import { Injectable } from '@nestjs/common';
import { EnrollmentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type LeaderboardView = 'organization' | 'department' | 'departments';

export interface LeaderboardFilters {
  trainingId?: string;
  departmentId?: string;
  location?: string;
  groupId?: string;
  view?: LeaderboardView;
  sortBy?:
    | 'quizScore'
    | 'scormScore'
    | 'overallScore'
    | 'completionRate'
    | 'learningPoints'
    | 'timeSpent'
    | 'completionPoints'
    | 'efficiency';
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  fullName: string;
  email: string;
  department: string;
  departmentId: string | null;
  location: string;
  learningPoints: number;
  trainingsCompleted: number;
  avgQuizScore: number | null;
  avgScormScore: number | null;
  overallScore: number | null;
  completionRate: number;
  avgTimeSpentSec: number;
  avgCompletionPoints: number;
  efficiencyScore: number;
  badges: string[];
  isCurrentUser?: boolean;
}

export interface DepartmentRanking {
  rank: number;
  departmentId: string | null;
  department: string;
  userCount: number;
  avgEfficiency: number;
  avgCompletionRate: number;
  totalLearningPoints: number;
  isCurrentUserDepartment?: boolean;
}

export interface LeaderboardPayload {
  view: LeaderboardView;
  lowestRank: number;
  me: LeaderboardEntry | null;
  /** Top performers for the active view (5–10 for department, up to limit for org). */
  topEntries: LeaderboardEntry[];
  /** 3 above + current user + 3 below (deduped). Empty if user not ranked. */
  nearbyEntries: LeaderboardEntry[];
  /** Full ranked list for the active view (org / department). */
  entries: LeaderboardEntry[];
  departmentRankings: DepartmentRanking[];
}

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getLeaderboard(
    filters: LeaderboardFilters,
    opts: { companyId?: string | null; currentUserId?: string; limit?: number } = {},
  ): Promise<LeaderboardPayload> {
    const limit = opts.limit ?? 50;
    const view: LeaderboardView = filters.view ?? 'organization';

    const meUser = opts.currentUserId
      ? await this.prisma.user.findUnique({
          where: { id: opts.currentUserId },
          select: { id: true, departmentId: true, companyId: true },
        })
      : null;

    const companyId = opts.companyId ?? meUser?.companyId ?? null;
    const effectiveDeptId =
      view === 'department'
        ? filters.departmentId || meUser?.departmentId || undefined
        : filters.departmentId;

    const ranked = await this.buildRankedEntries({
      ...filters,
      departmentId: view === 'departments' ? undefined : effectiveDeptId,
      companyId,
    });

    const lowestRank = ranked.length;
    const meIndex = opts.currentUserId
      ? ranked.findIndex((e) => e.userId === opts.currentUserId)
      : -1;
    const me =
      meIndex >= 0
        ? { ...ranked[meIndex], isCurrentUser: true }
        : null;

    const nearbyEntries =
      meIndex >= 0
        ? ranked.slice(Math.max(0, meIndex - 3), meIndex + 4).map((e) => ({
            ...e,
            isCurrentUser: e.userId === opts.currentUserId,
          }))
        : [];

    let entries: LeaderboardEntry[];
    let topEntries: LeaderboardEntry[];

    if (view === 'department') {
      topEntries = ranked.slice(0, Math.min(10, limit)).map((e) => ({
        ...e,
        isCurrentUser: e.userId === opts.currentUserId,
      }));
      entries = topEntries;
      // Ensure me is visible even if outside top 10
      if (me && !entries.some((e) => e.userId === me.userId)) {
        entries = [...entries, me];
      }
    } else if (view === 'organization') {
      entries = ranked.slice(0, limit).map((e) => ({
        ...e,
        isCurrentUser: e.userId === opts.currentUserId,
      }));
      topEntries = entries.slice(0, 10);
      if (me && !entries.some((e) => e.userId === me.userId)) {
        entries = [...entries, me];
      }
    } else {
      entries = [];
      topEntries = [];
    }

    const departmentRankings =
      view === 'departments'
        ? this.buildDepartmentRankings(ranked, meUser?.departmentId ?? null)
        : [];

    return {
      view,
      lowestRank,
      me,
      topEntries,
      nearbyEntries,
      entries,
      departmentRankings,
    };
  }

  /** Flat ranked list (legacy admin callers that expect an array). */
  async getLeaderboardFlat(
    filters: LeaderboardFilters,
    opts: { companyId?: string | null; currentUserId?: string; limit?: number } = {},
  ): Promise<LeaderboardEntry[]> {
    const payload = await this.getLeaderboard(filters, opts);
    return payload.entries.length ? payload.entries : payload.topEntries;
  }

  private async buildRankedEntries(
    filters: LeaderboardFilters & { companyId?: string | null },
  ): Promise<LeaderboardEntry[]> {
    // Include any active user with enrollments (learners + admins assigned training)
    const userWhere: Record<string, unknown> = {
      isActive: true,
      role: { in: [UserRole.LEARNER, UserRole.LMS_ADMIN, UserRole.LINE_MANAGER] },
    };
    if (filters.companyId) userWhere.companyId = filters.companyId;
    if (filters.departmentId) userWhere.departmentId = filters.departmentId;
    if (filters.location) userWhere.location = filters.location;
    if (filters.groupId) userWhere.groupMemberships = { some: { groupId: filters.groupId } };

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        ...(filters.trainingId ? { trainingId: filters.trainingId } : {}),
        user: userWhere,
      },
      include: {
        user: { include: { department: true } },
        assessmentAttempts: { orderBy: { score: 'desc' }, take: 1 },
        training: { select: { leaderboardEnabled: true, estimatedMinutes: true } },
      },
    });

    const byUser = new Map<string, typeof enrollments>();
    for (const e of enrollments) {
      if (!e.training.leaderboardEnabled) continue;
      const list = byUser.get(e.userId) ?? [];
      list.push(e);
      byUser.set(e.userId, list);
    }

    const userBadges = await this.prisma.userBadge.findMany({
      where: { userId: { in: [...byUser.keys()] } },
      include: { badge: true },
    });
    const badgesByUser = new Map<string, string[]>();
    for (const ub of userBadges) {
      const list = badgesByUser.get(ub.userId) ?? [];
      list.push(ub.badge.name);
      badgesByUser.set(ub.userId, list);
    }

    const entries: Omit<LeaderboardEntry, 'rank'>[] = [];

    for (const [userId, items] of byUser) {
      const user = items[0].user;
      const completedItems = items.filter((e) => e.status === EnrollmentStatus.COMPLETED);
      const completed = completedItems.length;
      const quizScores = items.map((e) => e.assessmentAttempts[0]?.score).filter((s): s is number => s != null);
      const scormScores = items.map((e) => e.scormScore).filter((s): s is number => s != null);
      const avgQuiz = quizScores.length ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length : null;
      const avgScorm = scormScores.length ? scormScores.reduce((a, b) => a + b, 0) / scormScores.length : null;
      const overallParts = [...quizScores, ...scormScores];
      const overall = overallParts.length ? overallParts.reduce((a, b) => a + b, 0) / overallParts.length : null;
      const totalTime = items.reduce((s, e) => s + e.timeSpentSec, 0);

      const completionPointsList = completedItems
        .map((e) => e.completionPoints)
        .filter((p): p is number => p != null);
      const avgCompletionPoints =
        completionPointsList.length > 0
          ? Math.round(completionPointsList.reduce((a, b) => a + b, 0) / completionPointsList.length)
          : 0;

      const efficiencyScore = this.computeEfficiencyScore(completedItems);

      const badges = badgesByUser.get(userId) ?? [];
      if (badges.length === 0) {
        if (completed >= 5) badges.push('Scholar');
        if (overall != null && overall >= 90) badges.push('Top Performer');
        if (completed >= 1) badges.push('First Course');
      }

      entries.push({
        userId,
        fullName: user.fullName,
        email: user.email,
        department: user.department?.name ?? 'Unassigned',
        departmentId: user.departmentId,
        location: user.location ?? '—',
        learningPoints: user.learningPoints,
        trainingsCompleted: completed,
        avgQuizScore: avgQuiz != null ? Math.round(avgQuiz * 10) / 10 : null,
        avgScormScore: avgScorm != null ? Math.round(avgScorm * 10) / 10 : null,
        overallScore: overall != null ? Math.round(overall * 10) / 10 : null,
        completionRate: items.length > 0 ? Math.round((completed / items.length) * 100) : 0,
        avgTimeSpentSec: items.length > 0 ? Math.round(totalTime / items.length) : 0,
        avgCompletionPoints,
        efficiencyScore,
        badges,
      });
    }

    const sortBy = filters.sortBy ?? 'learningPoints';
    entries.sort((a, b) => {
      const getVal = (e: typeof a) => {
        switch (sortBy) {
          case 'quizScore':
            return e.avgQuizScore ?? 0;
          case 'scormScore':
            return e.avgScormScore ?? 0;
          case 'completionRate':
            return e.completionRate;
          case 'learningPoints':
            return e.learningPoints;
          case 'completionPoints':
            return e.avgCompletionPoints;
          case 'timeSpent':
            return -e.avgTimeSpentSec;
          case 'overallScore':
            return e.overallScore ?? 0;
          case 'efficiency':
          default:
            return e.efficiencyScore;
        }
      };
      return getVal(b) - getVal(a);
    });

    return entries.map((e, i) => ({ ...e, rank: i + 1 }));
  }

  private buildDepartmentRankings(
    ranked: LeaderboardEntry[],
    currentDeptId: string | null,
  ): DepartmentRanking[] {
    const byDept = new Map<
      string,
      { departmentId: string | null; department: string; users: LeaderboardEntry[] }
    >();

    for (const e of ranked) {
      const key = e.departmentId ?? e.department;
      const bucket = byDept.get(key) ?? {
        departmentId: e.departmentId,
        department: e.department,
        users: [],
      };
      bucket.users.push(e);
      byDept.set(key, bucket);
    }

    const rows = [...byDept.values()].map((d) => {
      const n = d.users.length;
      const avgEfficiency = n ? Math.round(d.users.reduce((s, u) => s + u.efficiencyScore, 0) / n) : 0;
      const avgCompletionRate = n
        ? Math.round(d.users.reduce((s, u) => s + u.completionRate, 0) / n)
        : 0;
      const totalLearningPoints = d.users.reduce((s, u) => s + u.learningPoints, 0);
      return {
        departmentId: d.departmentId,
        department: d.department,
        userCount: n,
        avgEfficiency,
        avgCompletionRate,
        totalLearningPoints,
        isCurrentUserDepartment: currentDeptId != null && d.departmentId === currentDeptId,
      };
    });

    rows.sort((a, b) => b.totalLearningPoints - a.totalLearningPoints || b.userCount - a.userCount);
    return rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }

  private computeEfficiencyScore(
    completed: Array<{
      completionPoints: number | null;
      completionScore: number | null;
      timeSpentSec: number;
      training: { estimatedMinutes: number };
    }>,
  ): number {
    if (completed.length === 0) return 0;

    let total = 0;
    for (const e of completed) {
      const points = e.completionPoints ?? 0;
      const score = e.completionScore ?? 0;
      const expectedSec = Math.max(e.training.estimatedMinutes * 60, 60);
      const speedBonus = Math.max(0, 1.2 - e.timeSpentSec / expectedSec);
      total += points + score * 0.15 + speedBonus * 20;
    }
    return Math.round(total / completed.length);
  }

  async isVisibleToLearners(trainingId?: string): Promise<boolean> {
    if (!trainingId) {
      const any = await this.prisma.training.findFirst({
        where: { leaderboardVisibleToLearners: true, leaderboardEnabled: true },
      });
      return !!any;
    }
    const t = await this.prisma.training.findUnique({ where: { id: trainingId } });
    return !!(t?.leaderboardEnabled && t?.leaderboardVisibleToLearners);
  }
}
