/**
 * Database Storage Implementation using Prisma
 *
 * Stores all data in PostgreSQL database.
 * File uploads are stored in GCP Cloud Storage (production) or local filesystem (development).
 */

import { prisma, ApplicationStatus, ApplicationSource, Prisma } from '@sync-hire/database';
import type { CloudStorageProvider } from './cloud/cloud-storage-provider';
import {
  createStorageProvider,
  getCVBucket,
  getJDBucket,
} from './cloud/storage-provider-factory';
import type {
  CandidateApplication,
  ExtractedCVData,
  ExtractedJobData,
  Interview,
  InterviewQuestions,
  JobWithQuestions,
  Notification,
  User,
} from '@sync-hire/database';
import type { StorageInterface, Job } from './storage-interface';

export class DatabaseStorage implements StorageInterface {
  private cloudStorage: CloudStorageProvider;

  constructor() {
    this.cloudStorage = createStorageProvider();
  }

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
        location: data.location || '',
        employmentType: data.employmentType || 'Full-time',
        description: data.responsibilities?.join('\n') || '',
        requirements: data.requirements || [],
        jdExtraction: data,
        employerId: 'demo-user', // TODO: Get from auth
        status: 'DRAFT',
      },
    });
  }

  async saveUpload(hash: string, buffer: Buffer): Promise<string> {
    const bucket = getJDBucket();
    const path = `jd/${hash}`;
    const contentType = 'application/pdf';

    // Upload file to cloud storage
    const fileUrl = await this.cloudStorage.uploadFile(
      bucket,
      path,
      buffer,
      contentType
    );

    // Update database with file URL
    await prisma.job.update({
      where: { id: hash },
      data: { jdFileUrl: fileUrl },
    });

    return fileUrl;
  }

  getUploadPath(hash: string): string {
    return `/uploads/jd/${hash}`;
  }

  async hasExtraction(hash: string): Promise<boolean> {
    const count = await prisma.job.count({
      where: {
        id: hash,
        jdExtraction: { not: Prisma.JsonNull },
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

    // Return the job directly from Prisma - it already includes questions
    return job;
  }

  async getAllStoredJobs(): Promise<Job[]> {
    const jobs = await prisma.job.findMany({
      include: { questions: true },
      orderBy: { createdAt: 'desc' },
    });

    // Return jobs directly from Prisma - they already include questions
    return jobs;
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
    const bucket = getCVBucket();
    const path = `cv/${hash}`;
    const contentType = 'application/pdf';
    const fileSize = buffer.length;

    // Upload file to cloud storage
    const fileUrl = await this.cloudStorage.uploadFile(
      bucket,
      path,
      buffer,
      contentType
    );

    // Update database with file URL and size
    await prisma.cVUpload.update({
      where: { fileHash: hash },
      data: {
        fileUrl,
        fileSize,
      },
    });

    return fileUrl;
  }

  getCVUploadPath(hash: string): string {
    return `/uploads/cv/${hash}`;
  }

  async hasCVExtraction(hash: string): Promise<boolean> {
    const count = await prisma.cVUpload.count({
      where: {
        fileHash: hash,
        extraction: { not: Prisma.JsonNull },
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
        questionsData: { not: Prisma.JsonNull },
      },
    });
    return count > 0;
  }

  // =============================================================================
  // Interview Methods
  // =============================================================================

  async getInterview(id: string): Promise<Interview | null> {
    return prisma.interview.findUnique({
      where: { id },
    });
  }

  async getAllInterviews(): Promise<Interview[]> {
    return prisma.interview.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInterviewsForUser(userId: string): Promise<Interview[]> {
    return prisma.interview.findMany({
      where: { candidateId: userId },
      orderBy: { createdAt: 'desc' },
    });
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
        completedAt: interview.completedAt,
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
        completedAt: interview.completedAt,
        aiEvaluation: interview.aiEvaluation,
      },
    });
  }

  // =============================================================================
  // User Methods
  // =============================================================================

  async getUser(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
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

    return user;
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
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
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
    return prisma.candidateApplication.findMany({
      where: { jobId },
      orderBy: { matchScore: 'desc' },
    });
  }

  async getApplication(applicationId: string): Promise<CandidateApplication | null> {
    return prisma.candidateApplication.findUnique({
      where: { id: applicationId },
    });
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

  async getAllCVExtractions(): Promise<Array<{ cvId: string; userId: string; data: ExtractedCVData }>> {
    const cvs = await prisma.cVUpload.findMany({
      where: { extraction: { not: null } },
    });

    return cvs
      .filter((cv): cv is typeof cv & { extraction: ExtractedCVData } =>
        cv.extraction !== null
      )
      .map(cv => ({
        cvId: cv.id,
        userId: cv.userId,
        data: cv.extraction,
      }));
  }
}
