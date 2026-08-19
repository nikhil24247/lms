import { Injectable } from '@nestjs/common';
import { BadgeCriteria, EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  calculateCompletionPoints,
  formatDurationShort,
  timeRatioPercent,
} from '../../common/utils/completion-scoring.util';

@Injectable()
export class RecognitionService {
  constructor(private prisma: PrismaService) {}

  async onTrainingCompleted(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        training: true,
        assignment: true,
        assessmentAttempts: { orderBy: { score: 'desc' }, take: 1 },
      },
    });
    if (!enrollment || enrollment.status !== EnrollmentStatus.COMPLETED) return null;
    if (enrollment.completionPoints != null) return null;

    const passingScore =
      enrollment.assignment?.passingScorePercentage ?? enrollment.training.passingScorePercentage;
    const score = await this.resolveCompletionScore(enrollmentId, enrollment);

    if (score < passingScore) return null;

    const completedAt = enrollment.completedAt ?? new Date();
    let timeSpentSec = enrollment.timeSpentSec;
    if (enrollment.startedAt) {
      timeSpentSec = Math.max(
        1,
        Math.round((completedAt.getTime() - enrollment.startedAt.getTime()) / 1000),
      );
    } else if (timeSpentSec <= 0) {
      timeSpentSec = Math.max(60, enrollment.training.estimatedMinutes * 60);
    }

    const { points, speedTier } = calculateCompletionPoints({
      timeSpentSec,
      estimatedMinutes: enrollment.training.estimatedMinutes,
      score,
      passingScore,
    });

    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        timeSpentSec,
        completionScore: score,
        completionPoints: points,
      },
    });

    const timeLabel = formatDurationShort(timeSpentSec);
    await this.addPoints(
      enrollment.userId,
      points,
      `Completed: ${enrollment.training.title} (${Math.round(score)}% in ${timeLabel})`,
    );
    await this.updateStreak(enrollment.userId);
    await this.checkAndAwardBadges(enrollment.userId);

    return { points, score, timeSpentSec, speedTier };
  }

  private async resolveCompletionScore(
    enrollmentId: string,
    enrollment: {
      scormScore: number | null;
      quizPassed: boolean;
      assessmentAttempts: { score: number }[];
      training: { type: string };
    },
  ): Promise<number> {
    if (enrollment.assessmentAttempts[0]?.score != null) {
      return enrollment.assessmentAttempts[0].score;
    }

    const bestAttempt = await this.prisma.assessmentAttempt.findFirst({
      where: { enrollmentId },
      orderBy: { score: 'desc' },
    });
    if (bestAttempt) return bestAttempt.score;

    if (enrollment.scormScore != null) return enrollment.scormScore;
    if (enrollment.quizPassed) return 100;

    return 100;
  }

  async addPoints(userId: string, amount: number, reason: string) {
    if (amount <= 0) return;
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { learningPoints: { increment: amount } },
      }),
      this.prisma.pointsTransaction.create({
        data: { userId, amount, reason },
      }),
    ]);
  }

  async updateStreak(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const streak = await this.prisma.userStreak.findUnique({ where: { userId } });
    if (!streak) {
      await this.prisma.userStreak.create({
        data: { userId, currentStreak: 1, longestStreak: 1, lastActivityAt: today },
      });
      return;
    }

    const last = streak.lastActivityAt ? new Date(streak.lastActivityAt) : null;
    if (last) last.setHours(0, 0, 0, 0);

    let current = streak.currentStreak;
    if (!last || last.getTime() === today.getTime()) {
      return;
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (last.getTime() === yesterday.getTime()) {
      current += 1;
    } else {
      current = 1;
    }

    await this.prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: current,
        longestStreak: Math.max(streak.longestStreak, current),
        lastActivityAt: today,
      },
    });
  }

  async checkAndAwardBadges(userId: string) {
    const completedEnrollments = await this.prisma.enrollment.findMany({
      where: { userId, status: EnrollmentStatus.COMPLETED },
      include: { training: true, assignment: true },
    });
    const completed = completedEnrollments.length;

    const streak = await this.prisma.userStreak.findUnique({ where: { userId } });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { assessmentAttempts: { orderBy: { score: 'desc' }, take: 1 } },
    });
    const topScore = user?.assessmentAttempts[0]?.score ?? 0;

    const fastCompletions = completedEnrollments.filter((e) => {
      if (e.completionPoints == null || e.completionScore == null) return false;
      const passing =
        e.assignment?.passingScorePercentage ?? e.training.passingScorePercentage;
      if (e.completionScore < passing) return false;
      const ratio = timeRatioPercent(e.timeSpentSec, e.training.estimatedMinutes);
      return ratio <= 75;
    }).length;

    const badges = await this.prisma.badge.findMany({ where: { isActive: true } });
    for (const badge of badges) {
      const has = await this.prisma.userBadge.findUnique({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
      });
      if (has) continue;

      let earned = false;
      switch (badge.criteria) {
        case BadgeCriteria.COURSE_COMPLETION:
          earned = completed >= 1 && badge.threshold == null;
          break;
        case BadgeCriteria.MILESTONE:
          earned = badge.threshold != null && completed >= badge.threshold;
          break;
        case BadgeCriteria.STREAK:
          earned = badge.threshold != null && (streak?.currentStreak ?? 0) >= badge.threshold;
          break;
        case BadgeCriteria.TOP_PERFORMER:
          earned = badge.threshold != null && topScore >= badge.threshold;
          break;
        case BadgeCriteria.FAST_COMPLETION:
          earned =
            badge.threshold != null &&
            completedEnrollments.some((e) => {
              if (e.completionScore == null) return false;
              const passing =
                e.assignment?.passingScorePercentage ?? e.training.passingScorePercentage;
              if (e.completionScore < passing) return false;
              return timeRatioPercent(e.timeSpentSec, e.training.estimatedMinutes) <= badge.threshold!;
            });
          break;
        case BadgeCriteria.CUSTOM:
          if (badge.code === 'efficiency-expert') {
            earned = fastCompletions >= 3;
          }
          break;
        default:
          break;
      }

      if (earned) {
        await this.prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
        if (badge.points > 0) {
          await this.addPoints(userId, badge.points, `Badge earned: ${badge.name}`);
        }
      }
    }
  }

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        badges: { include: { badge: true }, orderBy: { earnedAt: 'desc' } },
        streak: true,
        pointsHistory: { orderBy: { createdAt: 'desc' }, take: 15 },
        certificates: { include: { training: { select: { title: true } } }, orderBy: { issuedAt: 'desc' }, take: 5 },
      },
    });
    if (!user) return null;

    const completedEnrollments = await this.prisma.enrollment.findMany({
      where: { userId, status: EnrollmentStatus.COMPLETED },
      include: { training: { select: { title: true, estimatedMinutes: true } } },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    const timedCompletions = completedEnrollments.filter((e) => e.startedAt && e.completedAt);
    const avgTimeSpentSec =
      timedCompletions.length > 0
        ? Math.round(
            timedCompletions.reduce((s, e) => s + e.timeSpentSec, 0) / timedCompletions.length,
          )
        : 0;

    return {
      fullName: user.fullName,
      learningPoints: user.learningPoints,
      trainingsCompleted: completedEnrollments.length,
      avgTimeSpentSec,
      currentStreak: user.streak?.currentStreak ?? 0,
      longestStreak: user.streak?.longestStreak ?? 0,
      badges: user.badges.map((ub) => ({
        code: ub.badge.code,
        name: ub.badge.name,
        description: ub.badge.description,
        icon: ub.badge.icon,
        earnedAt: ub.earnedAt,
      })),
      recentPoints: user.pointsHistory,
      recentCertificates: user.certificates,
      recentCompletions: completedEnrollments.map((e) => ({
        trainingTitle: e.training.title,
        startedAt: e.startedAt,
        completedAt: e.completedAt,
        timeSpentSec: e.timeSpentSec,
        completionScore: e.completionScore,
        completionPoints: e.completionPoints,
        estimatedMinutes: e.training.estimatedMinutes,
      })),
    };
  }

  async listBadges() {
    return this.prisma.badge.findMany({ orderBy: { name: 'asc' } });
  }

  async getRecognitionStats() {
    const [totalBadgesAwarded, activeLearners, totalPoints] = await Promise.all([
      this.prisma.userBadge.count(),
      this.prisma.user.count({ where: { role: 'LEARNER', isActive: true } }),
      this.prisma.user.aggregate({ _sum: { learningPoints: true } }),
    ]);
    return {
      totalBadgesAwarded,
      activeLearners,
      totalPoints: totalPoints._sum.learningPoints ?? 0,
      badgeCount: await this.prisma.badge.count({ where: { isActive: true } }),
    };
  }
}
