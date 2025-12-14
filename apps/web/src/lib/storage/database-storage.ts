/**
 * Database Storage Implementation using Prisma
 *
 * Stores all data in PostgreSQL database instead of files.
 * File uploads still handled separately (will be moved to GCP Cloud Storage).
 */

import { prisma, ApplicationStatus, ApplicationSource } from '@sync-hire/database';
import type {
  CandidateApplication,
  ExtractedCVData,
  ExtractedJobData,
  Interview,
  InterviewQuestions,
  Job,
  Notification,
  User,
} from '@sync-hire/database';
import type { StorageInterface } from './storage-interface';

export class DatabaseStorage implements StorageInterface {
  // =============================================================================
  // Job Description Extraction Methods
  // =============================================================================

  async getExtraction(hash: string): Promise<ExtractedJobData | null> {
    const job = await prisma.job.findUnique({
      where: { id: hash },
    });

    return job?.jdExtraction ?? null;
  }

  async saveExtraction(hash: string, data: ExtractedJobData): Promise<void> {
    await prisma.job.upsert({
      where: { id: hash },
      update: { jdExtraction: data },
      create: {
        id: hash,
        title: data.title || 'Untitled',
        company: data.company || 'Unknown',
        jdExtraction: data,
        employerId: 'demo-user', // TODO: Get from auth
        status: 'DRAFT',
      },
    });
  }

  async saveUpload(hash: string, buffer: Buffer): Promise<string> {
    // TODO: Upload to GCP Cloud Storage
    // For now, return a placeholder path
    const path = `/uploads/jd/${hash}`;

    await prisma.job.update({
      where: { id: hash },
      data: { jdFileUrl: path },
    });

    return path;
  }

  getUploadPath(hash: string): string {
    return `/uploads/jd/${hash}`;
  }

  async hasExtraction(hash: string): Promise<boolean> {
    const count = await prisma.job.count({
      where: {
        id: hash,
        jdExtraction: { not: null },
      },
    });
    return count > 0;
  }

  // =============================================================================
  // Job Posting Methods
  // =============================================================================

  async saveJob(id: string, job: Job): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Upsert job
      await tx.job.upsert({
        where: { id },
        update: {
          title: job.title,
          company: job.company,
          department: job.department,
          location: job.location,
          employmentType: job.employmentType,
          workArrangement: job.workArrangement,
          salary: job.salary,
          description: job.description,
          requirements: job.requirements,
          status: job.status,
          aiMatchingEnabled: job.aiMatchingEnabled,
          aiMatchingThreshold: job.aiMatchingThreshold,
          aiMatchingStatus: job.aiMatchingStatus,
        },
        create: {
          id,
          title: job.title,
          company: job.company,
          department: job.department,
          location: job.location,
          employmentType: job.employmentType,
          workArrangement: job.workArrangement,
          salary: job.salary,
          description: job.description,
          requirements: job.requirements,
          status: job.status,
          aiMatchingEnabled: job.aiMatchingEnabled,
          aiMatchingThreshold: job.aiMatchingThreshold,
          aiMatchingStatus: job.aiMatchingStatus,
          employerId: job.employerId,
        },
      });

      // Save questions if present (atomic with job save)
      if (job.questions && job.questions.length > 0) {
        // Delete existing questions
        await tx.jobQuestion.deleteMany({
          where: { jobId: id },
        });

        // Create new questions
        await tx.jobQuestion.createMany({
          data: job.questions.map((q, index) => ({
            jobId: id,
            content: q.content,
            type: q.type,
            duration: q.duration,
            category: q.category,
            order: index,
          })),
        });
      }
    });
  }

  async getJob(id: string): Promise<Job | null> {
    const job = await prisma.job.findUnique({
      where: { id },
      include: { questions: true },
    });

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      title: job.title,
      company: job.company,
      department: job.department || undefined,
      location: job.location,
      employmentType: job.employmentType,
      workArrangement: job.workArrangement,
      salary: job.salary || undefined,
      description: job.description,
      requirements: job.requirements,
      status: job.status,
      aiMatchingEnabled: job.aiMatchingEnabled,
      aiMatchingThreshold: job.aiMatchingThreshold || undefined,
      aiMatchingStatus: job.aiMatchingStatus || undefined,
      employerId: job.employerId,
      createdAt: job.createdAt.toISOString(),
      questions: job.questions.map(q => ({
        id: q.id,
        content: q.content,
        type: q.type,
        duration: q.duration,
        category: q.category || undefined,
      })),
    };
  }

  async getAllStoredJobs(): Promise<Job[]> {
    const jobs = await prisma.job.findMany({
      include: { questions: true },
      orderBy: { createdAt: 'desc' },
    });

    return jobs.map(job => ({
      id: job.id,
      title: job.title,
      company: job.company,
      department: job.department || undefined,
      location: job.location,
      employmentType: job.employmentType,
      workArrangement: job.workArrangement,
      salary: job.salary || undefined,
      description: job.description,
      requirements: job.requirements,
      status: job.status,
      aiMatchingEnabled: job.aiMatchingEnabled,
      aiMatchingThreshold: job.aiMatchingThreshold || undefined,
      aiMatchingStatus: job.aiMatchingStatus || undefined,
      employerId: job.employerId,
      createdAt: job.createdAt.toISOString(),
      questions: job.questions.map(q => ({
        id: q.id,
        content: q.content,
        type: q.type,
        duration: q.duration,
        category: q.category || undefined,
      })),
    }));
  }

  async hasJob(id: string): Promise<boolean> {
    const count = await prisma.job.count({ where: { id } });
    return count > 0;
  }

  // =============================================================================
  // CV Extraction Methods
  // =============================================================================

  async getCVExtraction(hash: string): Promise<ExtractedCVData | null> {
    const cv = await prisma.cVUpload.findUnique({
      where: { fileHash: hash },
    });

    return cv?.extraction ?? null;
  }

  async saveCVExtraction(hash: string, data: ExtractedCVData): Promise<void> {
    await prisma.cVUpload.upsert({
      where: { fileHash: hash },
      update: { extraction: data },
      create: {
        fileHash: hash,
        fileName: `cv_${hash}.pdf`,
        fileUrl: `/uploads/cv/${hash}`,
        fileSize: 0, // Will be updated when file is uploaded
        extraction: data,
        userId: 'demo-user', // TODO: Get from auth
      },
    });
  }

  async saveCVUpload(hash: string, buffer: Buffer): Promise<string> {
    // TODO: Upload to GCP Cloud Storage
    const path = `/uploads/cv/${hash}`;
    const fileSize = buffer.length;

    await prisma.cVUpload.update({
      where: { fileHash: hash },
      data: {
        fileUrl: path,
        fileSize,
      },
    });

    return path;
  }

  getCVUploadPath(hash: string): string {
    return `/uploads/cv/${hash}`;
  }

  async hasCVExtraction(hash: string): Promise<boolean> {
    const count = await prisma.cVUpload.count({
      where: {
        fileHash: hash,
        extraction: { not: null },
      },
    });
    return count > 0;
  }

  // =============================================================================
  // Interview Questions Methods
  // =============================================================================

  async getInterviewQuestions(hash: string): Promise<InterviewQuestions | null> {
    const application = await prisma.candidateApplication.findFirst({
      where: {
        OR: [
          { id: hash },
          // Generate hash from cvUploadId + jobId if stored that way
        ],
      },
    });

    if (!application?.questionsData) {
      return null;
    }

    return application.questionsData;
  }

  async saveInterviewQuestions(hash: string, data: InterviewQuestions): Promise<void> {
    // Find application by combining cvId and jobId from metadata
    const application = await prisma.candidateApplication.findFirst({
      where: {
        cvUploadId: data.metadata.cvId,
        jobId: data.metadata.jobId,
      },
    });

    if (!application) {
      throw new Error(
        `Cannot save interview questions: No application found for CV ${data.metadata.cvId} and job ${data.metadata.jobId}. ` +
        `The application must be created before saving questions.`
      );
    }

    await prisma.candidateApplication.update({
      where: { id: application.id },
      data: { questionsData: data },
    });
  }

  async hasInterviewQuestions(hash: string): Promise<boolean> {
    const count = await prisma.candidateApplication.count({
      where: {
        id: hash,
        questionsData: { not: null },
      },
    });
    return count > 0;
  }

  // =============================================================================
  // Interview Methods
  // =============================================================================

  async getInterview(id: string): Promise<Interview | null> {
    const interview = await prisma.interview.findUnique({
      where: { id },
    });

    if (!interview) {
      return null;
    }

    return {
      id: interview.id,
      jobId: interview.jobId,
      candidateId: interview.candidateId,
      status: interview.status,
      callId: interview.callId || undefined,
      transcript: interview.transcript || undefined,
      score: interview.score || undefined,
      durationMinutes: interview.durationMinutes || undefined,
      completedAt: interview.completedAt?.toISOString(),
      createdAt: interview.createdAt.toISOString(),
      aiEvaluation: interview.aiEvaluation ?? undefined,
    };
  }

  async getAllInterviews(): Promise<Interview[]> {
    const interviews = await prisma.interview.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return interviews.map(interview => ({
      id: interview.id,
      jobId: interview.jobId,
      candidateId: interview.candidateId,
      status: interview.status,
      callId: interview.callId || undefined,
      transcript: interview.transcript || undefined,
      score: interview.score || undefined,
      durationMinutes: interview.durationMinutes || undefined,
      completedAt: interview.completedAt?.toISOString(),
      createdAt: interview.createdAt.toISOString(),
      aiEvaluation: interview.aiEvaluation ?? undefined,
    }));
  }

  async getInterviewsForUser(userId: string): Promise<Interview[]> {
    const interviews = await prisma.interview.findMany({
      where: { candidateId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return interviews.map(interview => ({
      id: interview.id,
      jobId: interview.jobId,
      candidateId: interview.candidateId,
      status: interview.status,
      callId: interview.callId || undefined,
      transcript: interview.transcript || undefined,
      score: interview.score || undefined,
      durationMinutes: interview.durationMinutes || undefined,
      completedAt: interview.completedAt?.toISOString(),
      createdAt: interview.createdAt.toISOString(),
      aiEvaluation: interview.aiEvaluation ?? undefined,
    }));
  }

  async saveInterview(id: string, interview: Interview): Promise<void> {
    await prisma.interview.upsert({
      where: { id },
      update: {
        status: interview.status,
        callId: interview.callId,
        transcript: interview.transcript,
        score: interview.score,
        durationMinutes: interview.durationMinutes,
        completedAt: interview.completedAt ? new Date(interview.completedAt) : null,
        aiEvaluation: interview.aiEvaluation,
      },
      create: {
        id,
        jobId: interview.jobId,
        candidateId: interview.candidateId,
        status: interview.status,
        callId: interview.callId,
        transcript: interview.transcript,
        score: interview.score,
        durationMinutes: interview.durationMinutes,
        completedAt: interview.completedAt ? new Date(interview.completedAt) : null,
        aiEvaluation: interview.aiEvaluation,
      },
    });
  }

  // =============================================================================
  // User Methods
  // =============================================================================

  async getUser(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  async getCurrentUser(): Promise<User> {
    // TODO: Get from auth session
    // For now, return demo user
    const user = await prisma.user.findUnique({
      where: { id: 'demo-user' },
    });

    if (!user) {
      throw new Error('Demo user not found. Run pnpm db:seed');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  // =============================================================================
  // User CV Methods
  // =============================================================================

  async getUserCVId(userId: string): Promise<string | null> {
    const cv = await prisma.cVUpload.findFirst({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
    });

    return cv?.fileHash || null;
  }

  async saveUserCVId(userId: string, cvId: string): Promise<void> {
    // Link CV to user by updating userId
    await prisma.cVUpload.updateMany({
      where: { fileHash: cvId },
      data: { userId },
    });
  }

  // =============================================================================
  // Notification Methods
  // =============================================================================

  async getNotifications(userId: string): Promise<Notification[]> {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map(n => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      actionUrl: n.actionUrl || undefined,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async saveNotification(notification: Notification): Promise<void> {
    await prisma.notification.create({
      data: {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: notification.read,
        actionUrl: notification.actionUrl,
      },
    });
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  // =============================================================================
  // Candidate Application Methods
  // =============================================================================

  async getApplicationsForJob(jobId: string): Promise<CandidateApplication[]> {
    const applications = await prisma.candidateApplication.findMany({
      where: { jobId },
      orderBy: { matchScore: 'desc' },
    });

    return applications.map(app => ({
      id: app.id,
      jobId: app.jobId,
      cvUploadId: app.cvUploadId,
      userId: app.userId,
      candidateName: app.candidateName,
      candidateEmail: app.candidateEmail,
      matchScore: app.matchScore,
      matchReasons: app.matchReasons,
      skillGaps: app.skillGaps,
      status: app.status,
      source: app.source,
      interviewId: app.interviewId || undefined,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      questionsData: app.questionsData ?? undefined,
    }));
  }

  async getApplication(applicationId: string): Promise<CandidateApplication | null> {
    const app = await prisma.candidateApplication.findUnique({
      where: { id: applicationId },
    });

    if (!app) {
      return null;
    }

    return {
      id: app.id,
      jobId: app.jobId,
      cvUploadId: app.cvUploadId,
      userId: app.userId,
      candidateName: app.candidateName,
      candidateEmail: app.candidateEmail,
      matchScore: app.matchScore,
      matchReasons: app.matchReasons,
      skillGaps: app.skillGaps,
      status: app.status,
      source: app.source,
      interviewId: app.interviewId || undefined,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      questionsData: app.questionsData ?? undefined,
    };
  }

  async saveApplication(application: CandidateApplication): Promise<void> {
    await prisma.candidateApplication.upsert({
      where: { id: application.id },
      update: {
        matchScore: application.matchScore,
        matchReasons: application.matchReasons,
        skillGaps: application.skillGaps,
        status: application.status,
        interviewId: application.interviewId,
        questionsData: application.questionsData,
      },
      create: {
        id: application.id,
        jobId: application.jobId,
        cvUploadId: application.cvUploadId,
        userId: application.userId,
        candidateName: application.candidateName,
        candidateEmail: application.candidateEmail,
        matchScore: application.matchScore,
        matchReasons: application.matchReasons,
        skillGaps: application.skillGaps,
        status: application.status,
        source: application.source,
        interviewId: application.interviewId,
        questionsData: application.questionsData,
      },
    });
  }

  async getAllCVExtractions(): Promise<Array<{ cvId: string; data: ExtractedCVData }>> {
    const cvs = await prisma.cVUpload.findMany({
      where: { extraction: { not: null } },
    });

    return cvs
      .filter((cv): cv is typeof cv & { extraction: ExtractedCVData } =>
        cv.extraction !== null
      )
      .map(cv => ({
        cvId: cv.fileHash,
        data: cv.extraction,
      }));
  }
}
