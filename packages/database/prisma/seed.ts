/**
 * Database Seed Script
 *
 * Populates the database with initial demo data for development and testing.
 * Run with: pnpm db:seed
 */

import { prisma, disconnectPrisma } from '../src';

async function main() {
  // Production guard: prevent accidental seeding in production
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    throw new Error(
      'Seeding is not allowed in production. ' +
      'Set ALLOW_SEED=true to override this protection.'
    );
  }

  console.log('🌱 Starting database seed...');

  // =============================================================================
  // USERS
  // =============================================================================

  console.log('Creating users...');

  const demoCandidate = await prisma.user.upsert({
    where: { email: 'demo@synchire.com' },
    update: {},
    create: {
      id: 'demo-user',
      name: 'Demo Candidate',
      email: 'demo@synchire.com',
    },
  });

  const employer1 = await prisma.user.upsert({
    where: { email: 'hr@techcorp.com' },
    update: {},
    create: {
      id: 'employer-1',
      name: 'Sarah Johnson',
      email: 'hr@techcorp.com',
    },
  });

  const employer2 = await prisma.user.upsert({
    where: { email: 'talent@startup.io' },
    update: {},
    create: {
      id: 'employer-2',
      name: 'Mike Chen',
      email: 'talent@startup.io',
    },
  });

  console.log('✓ Created users:', {
    demoCandidate: demoCandidate.email,
    employer1: employer1.email,
    employer2: employer2.email,
  });

  // =============================================================================
  // ORGANIZATIONS
  // =============================================================================

  console.log('Creating organizations...');

  const techCorpOrg = await prisma.organization.upsert({
    where: { slug: 'techcorp' },
    update: {},
    create: {
      id: 'org-techcorp',
      name: 'TechCorp',
      slug: 'techcorp',
      description: 'Leading technology company building innovative solutions.',
      website: 'https://techcorp.com',
      industry: 'Technology',
      size: '201-500',
    },
  });

  const startupOrg = await prisma.organization.upsert({
    where: { slug: 'startup-io' },
    update: {},
    create: {
      id: 'org-startup',
      name: 'Startup.io',
      slug: 'startup-io',
      description: 'Fast-growing startup disrupting the industry.',
      website: 'https://startup.io',
      industry: 'Technology',
      size: '11-50',
    },
  });

  console.log('✓ Created organizations:', {
    techCorp: techCorpOrg.name,
    startup: startupOrg.name,
  });

  // =============================================================================
  // ORGANIZATION MEMBERS
  // =============================================================================

  console.log('Creating organization members...');

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: techCorpOrg.id,
        userId: employer1.id,
      },
    },
    update: {},
    create: {
      organizationId: techCorpOrg.id,
      userId: employer1.id,
      role: 'OWNER',
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: startupOrg.id,
        userId: employer2.id,
      },
    },
    update: {},
    create: {
      organizationId: startupOrg.id,
      userId: employer2.id,
      role: 'OWNER',
    },
  });

  console.log('✓ Created organization members');

  // =============================================================================
  // CV UPLOAD (Demo Candidate)
  // =============================================================================

  console.log('Creating CV upload...');

  const demoCV = await prisma.cVUpload.upsert({
    where: { fileHash: 'demo-cv-hash-123' },
    update: {},
    create: {
      userId: demoCandidate.id,
      fileName: 'john_doe_resume.pdf',
      fileUrl: '/uploads/demo-cv.pdf',
      fileHash: 'demo-cv-hash-123',
      fileSize: 204800, // 200KB
      extraction: {
        personalInfo: {
          fullName: 'John Doe',
          email: 'demo@synchire.com',
          phone: '+1 (555) 123-4567',
          location: 'San Francisco, CA',
          summary: 'Full-stack developer with 5 years of experience',
          linkedinUrl: 'https://linkedin.com/in/johndoe',
          githubUrl: 'https://github.com/johndoe',
        },
        experience: [
          {
            title: 'Senior Software Engineer',
            company: 'Tech Corp',
            location: 'San Francisco, CA',
            startDate: '2021-01',
            endDate: null,
            current: true,
            description: [
              'Led development of React-based dashboard',
              'Implemented CI/CD pipeline with GitHub Actions',
              'Mentored junior developers',
            ],
          },
          {
            title: 'Software Engineer',
            company: 'Startup Inc',
            location: 'Remote',
            startDate: '2019-06',
            endDate: '2021-01',
            current: false,
            description: [
              'Built RESTful APIs with Node.js',
              'Developed React components',
            ],
          },
        ],
        education: [
          {
            degree: 'Bachelor of Science',
            field: 'Computer Science',
            institution: 'University of California',
            location: 'Berkeley, CA',
            startDate: '2015-09',
            endDate: '2019-05',
            current: false,
          },
        ],
        skills: [
          'React',
          'TypeScript',
          'Node.js',
          'Python',
          'PostgreSQL',
          'Docker',
          'AWS',
          'Next.js',
          'GraphQL',
          'Git',
        ],
        certifications: [
          {
            name: 'AWS Certified Developer',
            issuer: 'Amazon Web Services',
            issueDate: '2022-03',
          },
        ],
        languages: [
          { language: 'English', proficiency: 'Native' },
          { language: 'Spanish', proficiency: 'Intermediate' },
        ],
        projects: [
          {
            name: 'Open Source Dashboard',
            description: 'React-based analytics dashboard with 1k+ stars',
            technologies: ['React', 'TypeScript', 'D3.js'],
            url: 'https://github.com/johndoe/dashboard',
          },
        ],
      },
    },
  });

  console.log('✓ Created CV upload:', demoCV.fileName);

  // =============================================================================
  // JOBS
  // =============================================================================

  console.log('Creating jobs...');

  const seniorEngineerJob = await prisma.job.create({
    data: {
      id: 'job-1',
      title: 'Senior Full Stack Engineer',
      organizationId: techCorpOrg.id,
      createdById: employer1.id,
      department: 'Engineering',
      location: 'San Francisco, CA',
      employmentType: 'Full-time',
      workArrangement: 'Hybrid',
      salary: '$150,000 - $200,000',
      description: `We're looking for a Senior Full Stack Engineer to join our growing team. You'll work on cutting-edge web applications using React, Node.js, and AWS.

Key Responsibilities:
- Design and implement scalable web applications
- Lead technical discussions and architecture decisions
- Mentor junior developers
- Collaborate with product and design teams`,
      requirements: [
        '5+ years of experience in full-stack development',
        'Expert knowledge of React and TypeScript',
        'Strong experience with Node.js and Express',
        'Experience with PostgreSQL or similar databases',
        'Familiarity with AWS services',
        'Excellent communication skills',
      ],
      status: 'ACTIVE',
      aiMatchingEnabled: true,
      aiMatchingThreshold: 75,
      aiMatchingStatus: 'COMPLETE',
      questions: {
        create: [
          {
            content: 'Describe your experience with React and modern frontend development.',
            type: 'LONG_ANSWER',
            duration: 3,
            category: 'Technical Skills',
            order: 1,
          },
          {
            content: 'Tell me about a challenging technical problem you solved recently.',
            type: 'LONG_ANSWER',
            duration: 3,
            category: 'Problem Solving',
            order: 2,
          },
          {
            content: 'How do you approach code reviews and mentoring junior developers?',
            type: 'LONG_ANSWER',
            duration: 2,
            category: 'Behavioral',
            order: 3,
          },
        ],
      },
    },
  });

  const backendEngineerJob = await prisma.job.create({
    data: {
      id: 'job-2',
      title: 'Backend Engineer',
      organizationId: startupOrg.id,
      createdById: employer2.id,
      department: 'Engineering',
      location: 'Remote',
      employmentType: 'Full-time',
      workArrangement: 'Remote',
      salary: '$120,000 - $160,000',
      description: `Join our startup as a Backend Engineer. Build scalable APIs and microservices that power our platform.`,
      requirements: [
        '3+ years of backend development experience',
        'Strong knowledge of Node.js or Python',
        'Experience with RESTful APIs and GraphQL',
        'Database design skills (PostgreSQL, MongoDB)',
        'Understanding of microservices architecture',
      ],
      status: 'ACTIVE',
      aiMatchingEnabled: false,
      questions: {
        create: [
          {
            content: 'Explain your experience with API design and best practices.',
            type: 'LONG_ANSWER',
            duration: 3,
            category: 'Technical Skills',
            order: 1,
          },
          {
            content: 'How do you ensure API security and performance?',
            type: 'LONG_ANSWER',
            duration: 2,
            category: 'Technical Skills',
            order: 2,
          },
        ],
      },
    },
  });

  console.log('✓ Created jobs:', {
    job1: seniorEngineerJob.title,
    job2: backendEngineerJob.title,
  });

  // =============================================================================
  // APPLICATION (Demo Candidate applied to Senior Engineer job)
  // =============================================================================

  console.log('Creating application...');

  const application = await prisma.candidateApplication.create({
    data: {
      jobId: seniorEngineerJob.id,
      cvUploadId: demoCV.id,
      userId: demoCandidate.id,
      candidateName: 'John Doe',
      candidateEmail: 'demo@synchire.com',
      matchScore: 92,
      matchReasons: [
        'Strong React and TypeScript experience (5+ years)',
        'Experience with Node.js and PostgreSQL',
        'AWS certification matches requirements',
        'Leadership and mentoring experience',
      ],
      skillGaps: [
        'Could benefit from more GraphQL experience',
      ],
      status: 'READY',
      source: 'AI_MATCH',
      questionsData: {
        metadata: {
          cvId: demoCV.id,
          jobId: seniorEngineerJob.id,
          generatedAt: new Date().toISOString(),
          questionCount: 6,
          customQuestionCount: 3,
          suggestedQuestionCount: 3,
        },
        customQuestions: [
          {
            id: 'q1',
            type: 'LONG_ANSWER',
            content: 'Describe your experience with React and modern frontend development.',
            required: true,
            order: 1,
          },
          {
            id: 'q2',
            type: 'LONG_ANSWER',
            content: 'Tell me about a challenging technical problem you solved recently.',
            required: true,
            order: 2,
          },
          {
            id: 'q3',
            type: 'LONG_ANSWER',
            content: 'How do you approach code reviews and mentoring junior developers?',
            required: true,
            order: 3,
          },
        ],
        suggestedQuestions: [
          {
            content: 'How have you used AWS services in your previous projects?',
            reason: 'Candidate has AWS certification, aligns with job requirements',
            category: 'technical',
          },
          {
            content: 'Describe your experience with CI/CD pipelines.',
            reason: 'Candidate mentioned GitHub Actions experience',
            category: 'technical',
          },
          {
            content: 'Tell me about your open source dashboard project.',
            reason: 'Shows initiative and React expertise',
            category: 'experience',
          },
        ],
      },
    },
  });

  console.log('✓ Created application:', {
    candidate: application.candidateName,
    job: seniorEngineerJob.title,
    matchScore: application.matchScore,
  });

  // =============================================================================
  // INTERVIEW (Demo interview for the application)
  // =============================================================================

  console.log('Creating interview...');

  const interview = await prisma.interview.create({
    data: {
      id: 'interview-1',
      jobId: seniorEngineerJob.id,
      candidateId: demoCandidate.id,
      status: 'COMPLETED',
      callId: 'demo-call-123',
      transcript: `Interviewer: Hello John! Thank you for joining us today. Let's start with your experience with React.

John: Thank you for having me! I've been working with React for over 5 years now. I started with class components and have transitioned to hooks and modern patterns. In my current role at Tech Corp, I lead the development of our main dashboard application which serves thousands of users daily.

Interviewer: That's impressive! Can you tell me about a challenging technical problem you've solved recently?

John: Certainly. We had a performance issue with our dashboard where complex data visualizations were causing the app to freeze. I implemented a solution using React.memo, useMemo, and virtualization techniques with react-window. This reduced render times by 70% and significantly improved user experience.

Interviewer: Excellent problem-solving skills! How do you approach mentoring junior developers?

John: I believe in hands-on mentoring. I conduct regular code reviews with detailed feedback, pair programming sessions, and I've set up a weekly knowledge-sharing session where we discuss best practices and new technologies. I try to create a safe environment where questions are encouraged.`,
      score: 88,
      durationMinutes: 25,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      aiEvaluation: {
        overallScore: 88,
        categories: {
          technicalKnowledge: 92,
          problemSolving: 90,
          communication: 85,
          experienceRelevance: 88,
        },
        strengths: [
          'Deep expertise in React and modern frontend development',
          'Strong problem-solving abilities with measurable results',
          'Excellent mentoring approach with structured processes',
          'Clear and articulate communication',
        ],
        improvements: [
          'Could elaborate more on team collaboration in distributed environments',
          'Would benefit from discussing more about system design at scale',
        ],
        summary: 'John is an excellent candidate with strong technical skills and leadership qualities. His 5+ years of React experience, problem-solving abilities, and mentoring approach align well with the Senior Full Stack Engineer role. Recommended for next round.',
      },
    },
  });

  // Link interview to application
  await prisma.candidateApplication.update({
    where: { id: application.id },
    data: {
      interviewId: interview.id,
      status: 'COMPLETED',
    },
  });

  console.log('✓ Created interview:', {
    candidate: 'John Doe',
    status: interview.status,
    score: interview.score,
  });

  // =============================================================================
  // NOTIFICATIONS
  // =============================================================================

  console.log('Creating notifications...');

  await prisma.notification.createMany({
    data: [
      {
        userId: demoCandidate.id,
        type: 'SUCCESS',
        title: 'Interview Completed',
        message: 'Your interview for Senior Full Stack Engineer has been completed. Results are now available!',
        read: false,
        actionUrl: '/interview/interview-1/results',
      },
      {
        userId: demoCandidate.id,
        type: 'INFO',
        title: 'New Job Match',
        message: 'We found a new job that matches your profile: Backend Engineer at Startup.io',
        read: false,
        actionUrl: '/candidate/jobs',
      },
      {
        userId: employer1.id,
        type: 'INFO',
        title: 'New Application',
        message: 'John Doe (92% match) has been auto-matched to Senior Full Stack Engineer',
        read: false,
        actionUrl: '/hr/jobs/job-1',
      },
    ],
  });

  console.log('✓ Created notifications');

  // =============================================================================
  // SUMMARY
  // =============================================================================

  console.log('\n✅ Database seeded successfully!');
  console.log('\nSummary:');
  console.log('- Users: 3 (1 candidate, 2 employers)');
  console.log('- Organizations: 2 (TechCorp, Startup.io)');
  console.log('- Organization Members: 2');
  console.log('- CV Uploads: 1');
  console.log('- Jobs: 2');
  console.log('- Applications: 1');
  console.log('- Interviews: 1 (completed)');
  console.log('- Notifications: 3');
  console.log('\nDemo accounts:');
  console.log('- Candidate: demo@synchire.com (demo-user)');
  console.log('- Employer 1: hr@techcorp.com (employer-1) - Owner of TechCorp');
  console.log('- Employer 2: talent@startup.io (employer-2) - Owner of Startup.io');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
