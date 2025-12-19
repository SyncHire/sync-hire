/**
 * Database Seed Script
 *
 * Populates the database with initial demo data for development and testing.
 * Uses upsert operations to be idempotent - safe to run multiple times.
 * Run with: pnpm db:seed
 *
 * Note: Uses Better Auth's hashPassword for password hashing.
 */

import { prisma, disconnectPrisma } from '../src';
import { hashPassword } from 'better-auth/crypto';

// Test passwords for seed users (complex for realistic testing)
const TEST_PASSWORDS = {
  candidate: 'Demo@User2024!',
  stripe: 'Stripe#HR2024',
  databricks: 'Databricks#HR2024',
  vercel: 'Vercel#HR2024',
  google: 'Google#HR2024',
  spotify: 'Spotify#HR2024',
};

async function main() {
  // Production guard: prevent accidental seeding in production
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    throw new Error(
      'Seeding is not allowed in production. ' +
      'Set ALLOW_SEED=true to override this protection.'
    );
  }

  console.log('🌱 Starting database seed (upsert mode)...');

  console.log('🔐 Hashing passwords...');
  const hashedPasswords = {
    candidate: await hashPassword(TEST_PASSWORDS.candidate),
    stripe: await hashPassword(TEST_PASSWORDS.stripe),
    databricks: await hashPassword(TEST_PASSWORDS.databricks),
    vercel: await hashPassword(TEST_PASSWORDS.vercel),
    google: await hashPassword(TEST_PASSWORDS.google),
    spotify: await hashPassword(TEST_PASSWORDS.spotify),
  };

  // =============================================================================
  // USERS
  // =============================================================================

  console.log('Upserting users...');

  const demoCandidate = await prisma.user.upsert({
    where: { id: 'demo-user' },
    create: {
      id: 'demo-user',
      name: 'Demo Candidate',
      email: 'demo@synchire.com',
      password: hashedPasswords.candidate,
      emailVerified: true,
    },
    update: {
      name: 'Demo Candidate',
      email: 'demo@synchire.com',
      password: hashedPasswords.candidate,
      emailVerified: true,
    },
  });

  const stripeEmployer = await prisma.user.upsert({
    where: { id: 'employer-stripe' },
    create: {
      id: 'employer-stripe',
      name: 'Sarah Chen',
      email: 'hr@stripe.com',
      password: hashedPasswords.stripe,
      emailVerified: true,
    },
    update: {
      name: 'Sarah Chen',
      email: 'hr@stripe.com',
      password: hashedPasswords.stripe,
      emailVerified: true,
    },
  });

  const databricksEmployer = await prisma.user.upsert({
    where: { id: 'employer-databricks' },
    create: {
      id: 'employer-databricks',
      name: 'Marcus Johnson',
      email: 'talent@databricks.com',
      password: hashedPasswords.databricks,
      emailVerified: true,
    },
    update: {
      name: 'Marcus Johnson',
      email: 'talent@databricks.com',
      password: hashedPasswords.databricks,
      emailVerified: true,
    },
  });

  const vercelEmployer = await prisma.user.upsert({
    where: { id: 'employer-vercel' },
    create: {
      id: 'employer-vercel',
      name: 'Emily Rodriguez',
      email: 'careers@vercel.com',
      password: hashedPasswords.vercel,
      emailVerified: true,
    },
    update: {
      name: 'Emily Rodriguez',
      email: 'careers@vercel.com',
      password: hashedPasswords.vercel,
      emailVerified: true,
    },
  });

  const googleEmployer = await prisma.user.upsert({
    where: { id: 'employer-google' },
    create: {
      id: 'employer-google',
      name: 'David Kim',
      email: 'recruiting@google.com',
      password: hashedPasswords.google,
      emailVerified: true,
    },
    update: {
      name: 'David Kim',
      email: 'recruiting@google.com',
      password: hashedPasswords.google,
      emailVerified: true,
    },
  });

  const spotifyEmployer = await prisma.user.upsert({
    where: { id: 'employer-spotify' },
    create: {
      id: 'employer-spotify',
      name: 'Anna Lindqvist',
      email: 'talent@spotify.com',
      password: hashedPasswords.spotify,
      emailVerified: true,
    },
    update: {
      name: 'Anna Lindqvist',
      email: 'talent@spotify.com',
      password: hashedPasswords.spotify,
      emailVerified: true,
    },
  });

  console.log('✓ Upserted 6 users (1 candidate, 5 employers)');

  // =============================================================================
  // ACCOUNTS (Better Auth credential accounts for email/password login)
  // =============================================================================

  console.log('Upserting credential accounts...');

  const userPasswordPairs = [
    { user: demoCandidate, password: hashedPasswords.candidate },
    { user: stripeEmployer, password: hashedPasswords.stripe },
    { user: databricksEmployer, password: hashedPasswords.databricks },
    { user: vercelEmployer, password: hashedPasswords.vercel },
    { user: googleEmployer, password: hashedPasswords.google },
    { user: spotifyEmployer, password: hashedPasswords.spotify },
  ];

  for (const { user, password } of userPasswordPairs) {
    await prisma.account.upsert({
      where: {
        providerId_accountId: {
          providerId: 'credential',
          accountId: user.id,
        },
      },
      create: {
        userId: user.id,
        providerId: 'credential',
        accountId: user.id,
        password,
      },
      update: {
        password,
      },
    });
  }

  console.log('✓ Upserted credential accounts for all users');

  // =============================================================================
  // ORGANIZATIONS (Real companies)
  // =============================================================================

  console.log('Upserting organizations...');

  const stripeOrg = await prisma.organization.upsert({
    where: { id: 'org-stripe' },
    create: {
      id: 'org-stripe',
      name: 'Stripe',
      slug: 'stripe',
      description: 'Financial infrastructure for the internet. Build products, do business, and accept payments globally.',
      website: 'https://stripe.com',
      industry: 'Financial Technology',
      size: '1001-5000',
    },
    update: {
      name: 'Stripe',
      slug: 'stripe',
      description: 'Financial infrastructure for the internet. Build products, do business, and accept payments globally.',
      website: 'https://stripe.com',
      industry: 'Financial Technology',
      size: '1001-5000',
    },
  });

  const databricksOrg = await prisma.organization.upsert({
    where: { id: 'org-databricks' },
    create: {
      id: 'org-databricks',
      name: 'Databricks',
      slug: 'databricks',
      description: 'The Data and AI Company. Unify analytics, data engineering, and machine learning.',
      website: 'https://databricks.com',
      industry: 'Data & Analytics',
      size: '5001-10000',
    },
    update: {
      name: 'Databricks',
      slug: 'databricks',
      description: 'The Data and AI Company. Unify analytics, data engineering, and machine learning.',
      website: 'https://databricks.com',
      industry: 'Data & Analytics',
      size: '5001-10000',
    },
  });

  const vercelOrg = await prisma.organization.upsert({
    where: { id: 'org-vercel' },
    create: {
      id: 'org-vercel',
      name: 'Vercel',
      slug: 'vercel',
      description: 'The Frontend Cloud. Build, scale, and secure a faster, personalized web.',
      website: 'https://vercel.com',
      industry: 'Cloud Infrastructure',
      size: '501-1000',
    },
    update: {
      name: 'Vercel',
      slug: 'vercel',
      description: 'The Frontend Cloud. Build, scale, and secure a faster, personalized web.',
      website: 'https://vercel.com',
      industry: 'Cloud Infrastructure',
      size: '501-1000',
    },
  });

  const googleOrg = await prisma.organization.upsert({
    where: { id: 'org-google' },
    create: {
      id: 'org-google',
      name: 'Google',
      slug: 'google',
      description: 'Organizing the world\'s information and making it universally accessible and useful.',
      website: 'https://google.com',
      industry: 'Technology',
      size: '10000+',
    },
    update: {
      name: 'Google',
      slug: 'google',
      description: 'Organizing the world\'s information and making it universally accessible and useful.',
      website: 'https://google.com',
      industry: 'Technology',
      size: '10000+',
    },
  });

  const spotifyOrg = await prisma.organization.upsert({
    where: { id: 'org-spotify' },
    create: {
      id: 'org-spotify',
      name: 'Spotify',
      slug: 'spotify',
      description: 'Audio streaming and media services provider with millions of songs and podcasts.',
      website: 'https://spotify.com',
      industry: 'Entertainment',
      size: '5001-10000',
    },
    update: {
      name: 'Spotify',
      slug: 'spotify',
      description: 'Audio streaming and media services provider with millions of songs and podcasts.',
      website: 'https://spotify.com',
      industry: 'Entertainment',
      size: '5001-10000',
    },
  });

  console.log('✓ Upserted 5 organizations');

  // =============================================================================
  // ORGANIZATION MEMBERS
  // =============================================================================

  console.log('Upserting organization members...');

  const memberPairs = [
    { orgId: stripeOrg.id, userId: stripeEmployer.id },
    { orgId: databricksOrg.id, userId: databricksEmployer.id },
    { orgId: vercelOrg.id, userId: vercelEmployer.id },
    { orgId: googleOrg.id, userId: googleEmployer.id },
    { orgId: spotifyOrg.id, userId: spotifyEmployer.id },
  ];

  for (const { orgId, userId } of memberPairs) {
    await prisma.member.upsert({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: userId,
        },
      },
      create: {
        organizationId: orgId,
        userId: userId,
        role: 'owner',
      },
      update: {
        role: 'owner',
      },
    });
  }

  console.log('✓ Upserted organization members');

  // =============================================================================
  // CV UPLOAD (Demo Candidate)
  // =============================================================================

  console.log('Upserting CV upload...');

  const cvExtraction = {
    personalInfo: {
      fullName: 'Demo Candidate',
      email: 'demo@synchire.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      summary: 'Full-stack engineer with 5+ years of experience building scalable web applications. Passionate about clean code, user experience, and modern development practices.',
      linkedinUrl: 'https://linkedin.com/in/demo-candidate',
      githubUrl: 'https://github.com/demo-candidate',
    },
    experience: [
      {
        title: 'Senior Software Engineer',
        company: 'TechStartup Inc.',
        location: 'San Francisco, CA',
        startDate: '2022-01',
        endDate: null,
        current: true,
        description: [
          'Led development of customer-facing dashboard serving 50K+ users',
          'Architected microservices migration reducing latency by 40%',
          'Mentored team of 3 junior developers on React best practices',
          'Implemented CI/CD pipelines reducing deployment time by 60%',
        ],
      },
      {
        title: 'Software Engineer',
        company: 'Digital Agency Co.',
        location: 'New York, NY',
        startDate: '2019-06',
        endDate: '2021-12',
        current: false,
        description: [
          'Built responsive web applications for Fortune 500 clients',
          'Developed RESTful APIs using Node.js and Express',
          'Collaborated with design team to implement pixel-perfect UIs',
          'Optimized database queries improving page load times by 30%',
        ],
      },
      {
        title: 'Junior Developer',
        company: 'WebDev Solutions',
        location: 'Boston, MA',
        startDate: '2018-01',
        endDate: '2019-05',
        current: false,
        description: [
          'Developed and maintained client websites using React and Vue.js',
          'Participated in code reviews and agile development processes',
          'Wrote unit tests achieving 80% code coverage',
        ],
      },
    ],
    education: [
      {
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        institution: 'University of California, Berkeley',
        location: 'Berkeley, CA',
        startDate: '2014-09',
        endDate: '2018-05',
        current: false,
        gpa: '3.7',
      },
    ],
    skills: [
      'React',
      'TypeScript',
      'Node.js',
      'Python',
      'PostgreSQL',
      'MongoDB',
      'AWS',
      'Docker',
      'Kubernetes',
      'GraphQL',
      'REST APIs',
      'Git',
      'CI/CD',
      'Agile/Scrum',
    ],
    certifications: [
      {
        name: 'AWS Solutions Architect Associate',
        issuer: 'Amazon Web Services',
        issueDate: '2023-03',
      },
    ],
    languages: [
      { language: 'English', proficiency: 'Native' },
      { language: 'Spanish', proficiency: 'Intermediate' },
    ],
    projects: [
      {
        name: 'Open Source Dashboard',
        description: 'React-based analytics dashboard with real-time data visualization',
        technologies: ['React', 'D3.js', 'WebSocket', 'Node.js'],
        url: 'https://github.com/demo-candidate/dashboard',
      },
    ],
  };

  const demoCV = await prisma.cVUpload.upsert({
    where: { fileHash: 'demo-cv-hash-123' },
    create: {
      userId: demoCandidate.id,
      fileName: 'demo_candidate_resume.pdf',
      fileUrl: '/uploads/demo-cv.pdf',
      fileHash: 'demo-cv-hash-123',
      fileSize: 204800,
      extraction: cvExtraction,
    },
    update: {
      userId: demoCandidate.id,
      fileName: 'demo_candidate_resume.pdf',
      fileUrl: '/uploads/demo-cv.pdf',
      fileSize: 204800,
      extraction: cvExtraction,
    },
  });

  console.log('✓ Upserted CV upload');

  // =============================================================================
  // JOBS (with questions)
  // =============================================================================

  console.log('Upserting jobs...');

  // Helper to upsert a job with its questions
  async function upsertJobWithQuestions(
    jobId: string,
    jobData: Parameters<typeof prisma.job.create>[0]['data'],
    questions: Array<{ content: string; type: 'LONG_ANSWER' | 'SHORT_ANSWER'; duration: number; category: string; order: number }>
  ) {
    // First upsert the job (without questions)
    const { questions: _, ...jobDataWithoutQuestions } = jobData as Record<string, unknown>;

    await prisma.job.upsert({
      where: { id: jobId },
      create: {
        id: jobId,
        ...jobDataWithoutQuestions,
      } as Parameters<typeof prisma.job.create>[0]['data'],
      update: jobDataWithoutQuestions as Parameters<typeof prisma.job.update>[0]['data'],
    });

    // Delete existing questions for this job
    await prisma.jobQuestion.deleteMany({
      where: { jobId },
    });

    // Create the questions
    if (questions.length > 0) {
      await prisma.jobQuestion.createMany({
        data: questions.map(q => ({
          jobId,
          content: q.content,
          type: q.type,
          duration: q.duration,
          category: q.category,
          order: q.order,
        })),
      });
    }
  }

  // Job 1: Stripe - Senior Frontend Engineer
  await upsertJobWithQuestions(
    'job-1',
    {
      title: 'Senior Frontend Engineer',
      organizationId: stripeOrg.id,
      createdById: stripeEmployer.id,
      department: 'Engineering',
      location: 'San Francisco, CA',
      employmentType: 'Full-time',
      workArrangement: 'Hybrid',
      salary: '$180,000 - $220,000',
      description: `Build beautiful, performant user interfaces for millions of businesses. Work with React, TypeScript, and modern web technologies.

Key Responsibilities:
- Design and implement scalable frontend architecture
- Lead technical discussions and code reviews
- Mentor junior developers
- Collaborate with product and design teams`,
      requirements: [
        '5+ years of experience with React and TypeScript',
        'Strong understanding of modern CSS and responsive design',
        'Experience with state management solutions (Redux, Zustand)',
        'Familiarity with testing frameworks (Jest, Playwright)',
        'Excellent problem-solving skills',
      ],
      status: 'ACTIVE',
      aiMatchingEnabled: true,
      aiMatchingThreshold: 75,
      aiMatchingStatus: 'COMPLETE',
    },
    [
      { content: 'Tell me about yourself and your experience with React.', type: 'LONG_ANSWER', duration: 3, category: 'Introduction', order: 1 },
      { content: 'How do you approach state management in large applications?', type: 'LONG_ANSWER', duration: 3, category: 'Technical Skills', order: 2 },
      { content: 'Describe a challenging performance issue you solved.', type: 'LONG_ANSWER', duration: 3, category: 'Problem Solving', order: 3 },
    ]
  );

  // Job 2: Databricks - Backend Engineer
  await upsertJobWithQuestions(
    'job-2',
    {
      title: 'Backend Engineer',
      organizationId: databricksOrg.id,
      createdById: databricksEmployer.id,
      department: 'Engineering',
      location: 'Remote',
      employmentType: 'Full-time',
      workArrangement: 'Remote',
      salary: '$160,000 - $200,000',
      description: `Build scalable APIs and services powering data analytics at scale. Work with Python, Go, and distributed systems.

Key Responsibilities:
- Design and implement high-performance APIs
- Work with large-scale distributed systems
- Optimize database queries and data pipelines
- Collaborate with data scientists and ML engineers`,
      requirements: [
        '4+ years of backend development experience',
        'Proficiency in Python or Go',
        'Experience with distributed systems',
        'Strong SQL and database design skills',
        'Experience with cloud platforms (AWS, GCP)',
      ],
      status: 'ACTIVE',
      aiMatchingEnabled: true,
      aiMatchingThreshold: 70,
      aiMatchingStatus: 'COMPLETE',
    },
    [
      { content: 'Tell me about your backend development experience.', type: 'LONG_ANSWER', duration: 3, category: 'Introduction', order: 1 },
      { content: 'How do you design RESTful APIs? Walk me through your approach.', type: 'LONG_ANSWER', duration: 3, category: 'Technical Skills', order: 2 },
    ]
  );

  // Job 3: Vercel - Full Stack Engineer
  await upsertJobWithQuestions(
    'job-3',
    {
      title: 'Full Stack Engineer',
      organizationId: vercelOrg.id,
      createdById: vercelEmployer.id,
      department: 'Engineering',
      location: 'New York, NY',
      employmentType: 'Full-time',
      workArrangement: 'Hybrid',
      salary: '$150,000 - $190,000',
      description: `Build the platform that powers the modern web. Work across the stack with Next.js, Node.js, and edge computing.

Key Responsibilities:
- Develop features across frontend and backend
- Work with Next.js and serverless technologies
- Optimize performance at the edge
- Contribute to open-source projects`,
      requirements: [
        '4+ years of full stack development',
        'Strong Next.js and React experience',
        'Node.js and serverless expertise',
        'Understanding of edge computing',
        'DevOps and CI/CD experience',
      ],
      status: 'ACTIVE',
      aiMatchingEnabled: true,
      aiMatchingThreshold: 75,
      aiMatchingStatus: 'COMPLETE',
    },
    [
      { content: 'Tell me about your full stack development journey.', type: 'LONG_ANSWER', duration: 3, category: 'Introduction', order: 1 },
      { content: 'How do you decide between server-side and client-side rendering?', type: 'LONG_ANSWER', duration: 3, category: 'Technical Skills', order: 2 },
      { content: 'Describe how you would debug a production performance issue.', type: 'LONG_ANSWER', duration: 3, category: 'Problem Solving', order: 3 },
    ]
  );

  // Job 4: Google - ML Engineer
  await upsertJobWithQuestions(
    'job-4',
    {
      title: 'ML Engineer',
      organizationId: googleOrg.id,
      createdById: googleEmployer.id,
      department: 'Engineering',
      location: 'Mountain View, CA',
      employmentType: 'Full-time',
      workArrangement: 'On-site',
      salary: '$200,000 - $280,000',
      description: `Build and deploy machine learning systems at scale. Work on cutting-edge AI infrastructure and model deployment.

Key Responsibilities:
- Design and implement ML pipelines
- Deploy models to production at scale
- Work with large datasets and distributed training
- Collaborate with research scientists`,
      requirements: [
        'MS/PhD in CS, ML, or related field',
        'Strong Python and ML frameworks',
        'Experience with PyTorch or TensorFlow',
        'MLOps and model deployment experience',
        'Distributed training experience',
      ],
      status: 'ACTIVE',
      aiMatchingEnabled: false,
    },
    [
      { content: 'Tell me about your ML engineering background.', type: 'LONG_ANSWER', duration: 3, category: 'Introduction', order: 1 },
      { content: 'Walk me through deploying an ML model to production.', type: 'LONG_ANSWER', duration: 3, category: 'Technical Skills', order: 2 },
    ]
  );

  // Job 5: Spotify - Mobile Engineer
  await upsertJobWithQuestions(
    'job-5',
    {
      title: 'Mobile Engineer',
      organizationId: spotifyOrg.id,
      createdById: spotifyEmployer.id,
      department: 'Engineering',
      location: 'Stockholm, Sweden',
      employmentType: 'Full-time',
      workArrangement: 'Hybrid',
      salary: '$130,000 - $170,000',
      description: `Build mobile experiences for hundreds of millions of users. Work with React Native, Swift, and Kotlin.

Key Responsibilities:
- Develop cross-platform mobile features
- Optimize app performance and battery usage
- Work on audio streaming features
- Collaborate with design and product teams`,
      requirements: [
        '4+ years of mobile development',
        'React Native or Flutter expertise',
        'iOS (Swift) or Android (Kotlin) experience',
        'Mobile CI/CD pipelines',
        'Performance optimization skills',
      ],
      status: 'ACTIVE',
      aiMatchingEnabled: true,
      aiMatchingThreshold: 70,
      aiMatchingStatus: 'COMPLETE',
    },
    [
      { content: 'Tell me about your mobile development experience.', type: 'LONG_ANSWER', duration: 3, category: 'Introduction', order: 1 },
      { content: 'How do you approach cross-platform development trade-offs?', type: 'LONG_ANSWER', duration: 3, category: 'Technical Skills', order: 2 },
    ]
  );

  // Job 6: Stripe - DevOps Engineer
  await upsertJobWithQuestions(
    'job-6',
    {
      title: 'DevOps Engineer',
      organizationId: stripeOrg.id,
      createdById: stripeEmployer.id,
      department: 'Infrastructure',
      location: 'San Francisco, CA',
      employmentType: 'Full-time',
      workArrangement: 'Hybrid',
      salary: '$170,000 - $210,000',
      description: `Build and maintain infrastructure serving millions of requests per second. Work with Kubernetes, Terraform, and cloud platforms.

Key Responsibilities:
- Design and implement CI/CD pipelines
- Manage Kubernetes clusters at scale
- Automate infrastructure with Terraform
- Ensure high availability and reliability`,
      requirements: [
        '4+ years of DevOps/SRE experience',
        'Strong Kubernetes expertise',
        'Infrastructure as Code (Terraform)',
        'Cloud platforms (AWS, GCP)',
        'Monitoring and observability tools',
      ],
      status: 'ACTIVE',
      aiMatchingEnabled: false,
    },
    [
      { content: 'Tell me about your infrastructure and DevOps experience.', type: 'LONG_ANSWER', duration: 3, category: 'Introduction', order: 1 },
      { content: 'How do you approach infrastructure as code?', type: 'LONG_ANSWER', duration: 3, category: 'Technical Skills', order: 2 },
    ]
  );

  console.log('✓ Upserted 6 jobs with questions');

  // =============================================================================
  // APPLICATIONS
  // =============================================================================

  console.log('Upserting applications...');

  // Application 1: Demo candidate applied to Stripe (with completed interview)
  const application1 = await prisma.candidateApplication.upsert({
    where: {
      jobId_userId: {
        jobId: 'job-1',
        userId: demoCandidate.id,
      },
    },
    create: {
      jobId: 'job-1',
      cvUploadId: demoCV.id,
      userId: demoCandidate.id,
      candidateName: 'Demo Candidate',
      candidateEmail: 'demo@synchire.com',
      matchScore: 92,
      matchReasons: [
        'Strong React and TypeScript experience (5+ years)',
        'Experience with state management and responsive design',
        'Proven mentoring and leadership experience',
        'AWS certification demonstrates cloud expertise',
      ],
      skillGaps: [
        'Could benefit from more Redux-specific experience',
      ],
      status: 'COMPLETED',
      source: 'AI_MATCH',
      questionsData: {
        metadata: {
          cvId: demoCV.id,
          jobId: 'job-1',
          generatedAt: new Date().toISOString(),
          questionCount: 6,
          customQuestionCount: 3,
          suggestedQuestionCount: 3,
        },
        customQuestions: [
          { id: 'q1', type: 'LONG_ANSWER', content: 'Tell me about yourself and your experience with React.', required: true, order: 1 },
          { id: 'q2', type: 'LONG_ANSWER', content: 'How do you approach state management in large applications?', required: true, order: 2 },
          { id: 'q3', type: 'LONG_ANSWER', content: 'Describe a challenging performance issue you solved.', required: true, order: 3 },
        ],
        suggestedQuestions: [
          { content: 'How have you used AWS services in your previous projects?', reason: 'Candidate has AWS certification', category: 'technical' },
          { content: 'Describe your experience with CI/CD pipelines.', reason: 'Mentioned GitHub Actions experience', category: 'technical' },
          { content: 'Tell me about your open source dashboard project.', reason: 'Shows initiative and React expertise', category: 'experience' },
        ],
      },
    },
    update: {
      cvUploadId: demoCV.id,
      candidateName: 'Demo Candidate',
      candidateEmail: 'demo@synchire.com',
      matchScore: 92,
      status: 'COMPLETED',
      source: 'AI_MATCH',
    },
  });

  // Application 2: Demo candidate applied to Databricks (ready for interview)
  await prisma.candidateApplication.upsert({
    where: {
      jobId_userId: {
        jobId: 'job-2',
        userId: demoCandidate.id,
      },
    },
    create: {
      jobId: 'job-2',
      cvUploadId: demoCV.id,
      userId: demoCandidate.id,
      candidateName: 'Demo Candidate',
      candidateEmail: 'demo@synchire.com',
      matchScore: 85,
      matchReasons: [
        'Strong backend development experience',
        'PostgreSQL and MongoDB knowledge',
        'Python experience from previous projects',
        'AWS and cloud platform expertise',
      ],
      skillGaps: [
        'Limited Go experience',
        'No explicit distributed systems mentioned',
      ],
      status: 'READY',
      source: 'MANUAL_APPLY',
    },
    update: {
      cvUploadId: demoCV.id,
      candidateName: 'Demo Candidate',
      candidateEmail: 'demo@synchire.com',
      matchScore: 85,
      status: 'READY',
      source: 'MANUAL_APPLY',
    },
  });

  // Application 3: Demo candidate applied to Vercel (with completed interview)
  const application3 = await prisma.candidateApplication.upsert({
    where: {
      jobId_userId: {
        jobId: 'job-3',
        userId: demoCandidate.id,
      },
    },
    create: {
      jobId: 'job-3',
      cvUploadId: demoCV.id,
      userId: demoCandidate.id,
      candidateName: 'Demo Candidate',
      candidateEmail: 'demo@synchire.com',
      matchScore: 88,
      matchReasons: [
        'Full stack development experience',
        'React and Node.js expertise',
        'Experience with CI/CD pipelines',
        'Strong understanding of web performance',
      ],
      skillGaps: [
        'Edge computing experience could be deeper',
      ],
      status: 'COMPLETED',
      source: 'AI_MATCH',
    },
    update: {
      cvUploadId: demoCV.id,
      candidateName: 'Demo Candidate',
      candidateEmail: 'demo@synchire.com',
      matchScore: 88,
      status: 'COMPLETED',
      source: 'AI_MATCH',
    },
  });

  console.log('✓ Upserted 3 applications');

  // =============================================================================
  // INTERVIEWS
  // =============================================================================

  console.log('Upserting interviews...');

  // Interview 1: Stripe - Completed with high score
  const interview1 = await prisma.interview.upsert({
    where: { id: 'interview-1' },
    create: {
      id: 'interview-1',
      jobId: 'job-1',
      candidateId: demoCandidate.id,
      status: 'COMPLETED',
      callId: 'stripe-call-123',
      transcript: `Interviewer: Hello! Thank you for joining us today. Let's start with your experience with React.

Candidate: Thank you for having me! I've been working with React for over 5 years now. In my current role, I lead the development of our main dashboard application which serves 50K+ users daily. I've worked extensively with hooks, context API, and have experience with both Redux and Zustand for state management.

Interviewer: That's impressive! Can you tell me about a challenging performance issue you've solved?

Candidate: Certainly. We had a performance issue where complex data visualizations were causing the app to freeze. I implemented React.memo, useMemo for expensive calculations, and virtualization with react-window for long lists. This reduced render times by 70% and significantly improved user experience.

Interviewer: Excellent problem-solving! How do you approach mentoring junior developers?

Candidate: I believe in hands-on mentoring. I conduct regular code reviews with detailed feedback, pair programming sessions, and I've set up weekly knowledge-sharing sessions where we discuss best practices and new technologies.`,
      score: 92,
      durationMinutes: 28,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      aiEvaluation: {
        overallScore: 92,
        categories: {
          technicalKnowledge: 95,
          problemSolving: 90,
          communication: 92,
          experienceRelevance: 91,
        },
        strengths: [
          'Exceptional technical depth in React and TypeScript',
          'Clear and structured communication style',
          'Strong system design understanding',
          'Proven leadership and mentoring abilities',
        ],
        improvements: [
          'Could elaborate more on testing strategies',
        ],
        summary: 'Outstanding candidate with excellent technical skills and communication. Highly recommended for the Senior Frontend Engineer role.',
      },
    },
    update: {
      status: 'COMPLETED',
      score: 92,
      durationMinutes: 28,
    },
  });

  // Interview 2: Vercel - Completed with good score
  const interview2 = await prisma.interview.upsert({
    where: { id: 'interview-2' },
    create: {
      id: 'interview-2',
      jobId: 'job-3',
      candidateId: demoCandidate.id,
      status: 'COMPLETED',
      callId: 'vercel-call-456',
      transcript: `Interviewer: Welcome! Tell me about your full stack development journey.

Candidate: I started as a frontend developer working with React, then gradually moved into backend development with Node.js. I've built several full-stack applications, including a real-time analytics dashboard using Next.js and WebSocket.

Interviewer: How do you decide between SSR and CSR?

Candidate: It depends on the use case. For SEO-critical pages and initial load performance, I prefer SSR or SSG. For highly interactive dashboards with real-time data, CSR makes more sense. Next.js allows me to mix these approaches, which is very powerful.

Interviewer: How would you debug a production performance issue?

Candidate: First, I'd use observability tools like Datadog or New Relic to identify bottlenecks. Then I'd reproduce the issue in staging, use React DevTools profiler for frontend issues, and database query analyzers for backend. I always focus on measuring before and after to quantify improvements.`,
      score: 85,
      durationMinutes: 25,
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      aiEvaluation: {
        overallScore: 85,
        categories: {
          technicalKnowledge: 88,
          problemSolving: 84,
          communication: 86,
          experienceRelevance: 82,
        },
        strengths: [
          'Strong full-stack experience with modern technologies',
          'Good understanding of SSR vs CSR trade-offs',
          'Methodical debugging approach',
          'Experience with observability tools',
        ],
        improvements: [
          'Could discuss edge computing in more depth',
          'More specific examples of serverless implementations',
        ],
        summary: 'Strong candidate with well-rounded skills. Would be a valuable addition to the Full Stack Engineer team.',
      },
    },
    update: {
      status: 'COMPLETED',
      score: 85,
      durationMinutes: 25,
    },
  });

  // Interview 3: Spotify - Pending
  await prisma.interview.upsert({
    where: { id: 'interview-3' },
    create: {
      id: 'interview-3',
      jobId: 'job-5',
      candidateId: demoCandidate.id,
      status: 'PENDING',
      durationMinutes: 0,
    },
    update: {
      status: 'PENDING',
    },
  });

  // Link interviews to applications
  await prisma.candidateApplication.update({
    where: { id: application1.id },
    data: { interviewId: interview1.id },
  });

  await prisma.candidateApplication.update({
    where: { id: application3.id },
    data: { interviewId: interview2.id },
  });

  console.log('✓ Upserted 3 interviews (2 completed, 1 pending)');

  // =============================================================================
  // NOTIFICATIONS
  // =============================================================================

  console.log('Upserting notifications...');

  // For notifications, we'll use a deterministic ID based on content
  const notificationData = [
    {
      id: 'notif-demo-stripe-complete',
      userId: demoCandidate.id,
      type: 'SUCCESS' as const,
      title: 'Interview Completed',
      message: 'Your interview for Senior Frontend Engineer at Stripe has been completed. Results are now available!',
      read: false,
      actionUrl: '/interview/interview-1/results',
    },
    {
      id: 'notif-demo-vercel-complete',
      userId: demoCandidate.id,
      type: 'SUCCESS' as const,
      title: 'Interview Completed',
      message: 'Your interview for Full Stack Engineer at Vercel has been completed. Results are now available!',
      read: true,
      actionUrl: '/interview/interview-2/results',
    },
    {
      id: 'notif-demo-databricks-match',
      userId: demoCandidate.id,
      type: 'INFO' as const,
      title: 'New Job Match',
      message: 'We found a new job that matches your profile: Backend Engineer at Databricks',
      read: false,
      actionUrl: '/candidate/jobs',
    },
    {
      id: 'notif-stripe-new-app',
      userId: stripeEmployer.id,
      type: 'INFO' as const,
      title: 'New Application',
      message: 'Demo Candidate (92% match) has been auto-matched to Senior Frontend Engineer',
      read: false,
      actionUrl: '/hr/jobs/job-1',
    },
    {
      id: 'notif-vercel-interview-complete',
      userId: vercelEmployer.id,
      type: 'INFO' as const,
      title: 'Interview Completed',
      message: 'Demo Candidate has completed their interview for Full Stack Engineer',
      read: false,
      actionUrl: '/hr/jobs/job-3',
    },
  ];

  for (const notif of notificationData) {
    await prisma.notification.upsert({
      where: { id: notif.id },
      create: notif,
      update: {
        type: notif.type,
        title: notif.title,
        message: notif.message,
        actionUrl: notif.actionUrl,
      },
    });
  }

  console.log('✓ Upserted 5 notifications');

  // =============================================================================
  // SUMMARY
  // =============================================================================

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log('- Users: 6 (1 candidate, 5 employers)');
  console.log('- Organizations: 5 (Stripe, Databricks, Vercel, Google, Spotify)');
  console.log('- Organization Members: 5');
  console.log('- CV Uploads: 1');
  console.log('- Jobs: 6');
  console.log('- Applications: 3');
  console.log('- Interviews: 3 (2 completed, 1 pending)');
  console.log('- Notifications: 5');
  console.log('\n🔑 Login credentials:');
  console.log(`- Candidate: demo@synchire.com / ${TEST_PASSWORDS.candidate}`);
  console.log(`- Stripe: hr@stripe.com / ${TEST_PASSWORDS.stripe}`);
  console.log(`- Databricks: talent@databricks.com / ${TEST_PASSWORDS.databricks}`);
  console.log(`- Vercel: careers@vercel.com / ${TEST_PASSWORDS.vercel}`);
  console.log(`- Google: recruiting@google.com / ${TEST_PASSWORDS.google}`);
  console.log(`- Spotify: talent@spotify.com / ${TEST_PASSWORDS.spotify}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
