import {
  PrismaClient,
  UserRole,
  TrainingType,
  QuestionType,
  EnrollmentStatus,
  AssignmentTargetType,
  BadgeCriteria,
  DiscussionType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function seedCompanyTraining(
  companyId: string,
  adminId: string,
  learnerIds: string[],
  title: string,
) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  const training = await prisma.training.create({
    data: {
      title,
      description: `Mandatory security training for ${title.split(' ')[0]} employees.`,
      type: TrainingType.VIDEO_QUIZ,
      companyId,
      passingScorePercentage: 70,
      maxRetries: 3,
      estimatedMinutes: 20,
      publishedAt: new Date(),
      createdById: adminId,
      questions: {
        create: [
          {
            questionText: 'What is phishing?',
            order: 0,
            options: {
              create: [
                { optionText: 'A fraudulent email attempt', isCorrect: true, order: 0 },
                { optionText: 'A type of antivirus', isCorrect: false, order: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  const assignment = await prisma.trainingAssignment.create({
    data: {
      trainingId: training.id,
      targetType: AssignmentTargetType.ALL,
      dueDate,
      isMandatory: true,
      passingScorePercentage: 70,
      autoRemindDaysBefore: 3,
      createdById: adminId,
    },
  });

  for (const userId of learnerIds) {
    await prisma.enrollment.create({
      data: {
        userId,
        trainingId: training.id,
        assignmentId: assignment.id,
        dueDate,
        status: EnrollmentStatus.NOT_STARTED,
      },
    });
  }

  return training;
}

async function main() {
  await prisma.discussionReply.deleteMany();
  await prisma.discussionPost.deleteMany();
  await prisma.pointsTransaction.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.userStreak.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationSettings.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.assessmentSubmission.deleteMany();
  await prisma.reminderTemplate.deleteMany();
  await prisma.scormSession.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.trainingAssignment.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.training.deleteMany();
  await prisma.userGroupMember.deleteMany();
  await prisma.userGroup.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.uploadJob.deleteMany();
  await prisma.multipartUpload.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.company.deleteMany();

  const acme = await prisma.company.create({
    data: {
      name: 'Acme Corp',
      slug: 'acme',
      maxUsers: 200,
      maxCourses: 50,
      primaryColor: '#0d9488',
    },
  });

  const globex = await prisma.company.create({
    data: {
      name: 'Globex Industries',
      slug: 'globex',
      maxUsers: 100,
      maxCourses: 25,
      primaryColor: '#6366f1',
    },
  });

  const acmeEng = await prisma.department.create({
    data: { name: 'Engineering', code: 'ENG', companyId: acme.id },
  });
  const acmeSales = await prisma.department.create({
    data: { name: 'Sales', code: 'SALES', companyId: acme.id },
  });
  const globexOps = await prisma.department.create({
    data: { name: 'Operations', code: 'OPS', companyId: globex.id },
  });

  await prisma.user.create({
    data: {
      email: 'superadmin@example.com',
      fullName: 'Pat Platform',
      role: UserRole.SYSTEM_ADMIN,
    },
  });

  const acmeAdmin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      fullName: 'Casey Admin',
      role: UserRole.LMS_ADMIN,
      companyId: acme.id,
      departmentId: acmeEng.id,
    },
  });

  const globexAdmin = await prisma.user.create({
    data: {
      email: 'globexadmin@example.com',
      fullName: 'Morgan Globex',
      role: UserRole.LMS_ADMIN,
      companyId: globex.id,
      departmentId: globexOps.id,
    },
  });

  const acmeLearner = await prisma.user.create({
    data: {
      email: 'learner@example.com',
      fullName: 'Alex Learner',
      role: UserRole.LEARNER,
      companyId: acme.id,
      departmentId: acmeEng.id,
      location: 'New York',
      learningPoints: 20,
    },
  });

  await prisma.user.create({
    data: {
      email: 'sales@example.com',
      fullName: 'Sam Sales',
      role: UserRole.LEARNER,
      companyId: acme.id,
      departmentId: acmeSales.id,
      location: 'Chicago',
    },
  });

  const globexLearner = await prisma.user.create({
    data: {
      email: 'globexlearner@example.com',
      fullName: 'Taylor Globex',
      role: UserRole.LEARNER,
      companyId: globex.id,
      departmentId: globexOps.id,
      location: 'London',
    },
  });

  await prisma.reminderTemplate.createMany({
    data: [
      {
        companyId: acme.id,
        name: '3 Days Before Due',
        subject: 'Reminder: {{training}} due in 3 days',
        bodyHtml: 'Hi {{learner}}, complete {{training}} by {{dueDate}}.',
        daysBeforeDue: 3,
        isDefault: true,
      },
      {
        companyId: acme.id,
        name: 'Due Today',
        subject: '{{training}} is due today',
        bodyHtml: 'Hi {{learner}}, {{training}} is due today ({{dueDate}}).',
        daysBeforeDue: 0,
        isDefault: true,
      },
      {
        companyId: acme.id,
        name: 'Overdue Notice',
        subject: 'OVERDUE: {{training}}',
        bodyHtml: 'Hi {{learner}}, {{training}} is overdue.',
        isOverdue: true,
        isDefault: true,
      },
      {
        companyId: globex.id,
        name: '3 Days Before Due',
        subject: 'Reminder: {{training}} due in 3 days',
        bodyHtml: 'Hi {{learner}}, complete {{training}} by {{dueDate}}.',
        daysBeforeDue: 3,
        isDefault: true,
      },
      {
        companyId: globex.id,
        name: 'Due Today',
        subject: '{{training}} is due today',
        bodyHtml: 'Hi {{learner}}, {{training}} is due today ({{dueDate}}).',
        daysBeforeDue: 0,
        isDefault: true,
      },
      {
        companyId: globex.id,
        name: 'Overdue Notice',
        subject: 'OVERDUE: {{training}}',
        bodyHtml: 'Hi {{learner}}, {{training}} is overdue.',
        isOverdue: true,
        isDefault: true,
      },
    ],
  });

  await prisma.notificationSettings.create({
    data: {
      id: 'default',
      emailEnabled: true,
      pushEnabled: false,
      slackEnabled: false,
      teamsEnabled: false,
      notifyPending: true,
      notifyOverdue: true,
    },
  });

  await prisma.badge.createMany({
    data: [
      { code: 'first-course', name: 'First Steps', description: 'Completed your first training course', criteria: BadgeCriteria.COURSE_COMPLETION, points: 25 },
      { code: 'scholar', name: 'Scholar', description: 'Completed 3 training courses', criteria: BadgeCriteria.MILESTONE, threshold: 3, points: 50 },
      { code: 'quick-learner', name: 'Quick Learner', description: 'Completed a training in under 75% of the estimated time with a passing score', criteria: BadgeCriteria.FAST_COMPLETION, threshold: 75, points: 30 },
      { code: 'speed-demon', name: 'Speed Demon', description: 'Completed a training in under 50% of the estimated time with a passing score', criteria: BadgeCriteria.FAST_COMPLETION, threshold: 50, points: 50 },
      { code: 'efficiency-expert', name: 'Efficiency Expert', description: 'Completed 3 trainings under 75% of estimated time', criteria: BadgeCriteria.CUSTOM, points: 75 },
    ],
  });

  await seedCompanyTraining(acme.id, acmeAdmin.id, [acmeLearner.id], 'Acme Cybersecurity Awareness');
  await prisma.training.create({
    data: {
      title: 'Acme Workplace Safety (SCORM)',
      description: 'SCORM module for Acme employees.',
      type: TrainingType.SCORM,
      companyId: acme.id,
      passingScorePercentage: 80,
      estimatedMinutes: 30,
      publishedAt: new Date(),
      createdById: acmeAdmin.id,
    },
  });

  await seedCompanyTraining(globex.id, globexAdmin.id, [globexLearner.id], 'Globex Security Essentials');

  await prisma.discussionPost.create({
    data: {
      userId: acmeLearner.id,
      type: DiscussionType.FEED,
      body: 'Acme team — great phishing awareness course!',
      isPinned: true,
    },
  });

  console.log('Seed completed.');
  console.log('Super Admin: superadmin@example.com (platform view — use company switcher)');
  console.log('Acme Company Admin: admin@example.com');
  console.log('Globex Company Admin: globexadmin@example.com');
  console.log('Acme Learner: learner@example.com');
  console.log('Globex Learner: globexlearner@example.com');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
