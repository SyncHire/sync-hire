/**
 * Test Data Factories
 *
 * Creates test data with sensible defaults. Follows the factory pattern
 * for creating valid test entities.
 */

import type { TransactionClient } from "./prisma-test-context";

/**
 * Creates a test user with default values
 */
export async function createTestUser(
  prisma: TransactionClient,
  overrides: {
    name?: string;
    email?: string;
    emailVerified?: boolean;
  } = {},
) {
  return prisma.user.create({
    data: {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? `test-${Date.now()}@example.com`,
      emailVerified: overrides.emailVerified ?? true,
    },
  });
}

/**
 * Creates a test organization with default values
 */
export async function createTestOrganization(
  prisma: TransactionClient,
  overrides: {
    name?: string;
    slug?: string;
  } = {},
) {
  return prisma.organization.create({
    data: {
      name: overrides.name ?? "Test Organization",
      slug: overrides.slug ?? `test-org-${Date.now()}`,
    },
  });
}

/**
 * Creates a test member (org membership)
 */
export async function createTestMember(
  prisma: TransactionClient,
  userId: string,
  organizationId: string,
  role: "owner" | "admin" | "member" = "member",
) {
  return prisma.member.create({
    data: {
      userId,
      organizationId,
      role,
    },
  });
}

/**
 * Creates a test job with default values
 */
export async function createTestJob(
  prisma: TransactionClient,
  organizationId: string,
  createdById: string,
  overrides: {
    title?: string;
    location?: string;
    employmentType?: string;
    description?: string;
    requirements?: string[];
    status?: "DRAFT" | "ACTIVE" | "CLOSED";
  } = {},
) {
  return prisma.job.create({
    data: {
      title: overrides.title ?? "Test Software Engineer",
      location: overrides.location ?? "Remote",
      employmentType: overrides.employmentType ?? "Full-time",
      description: overrides.description ?? "Test job description",
      requirements: overrides.requirements ?? ["TypeScript", "React"],
      status: overrides.status ?? "ACTIVE",
      organization: { connect: { id: organizationId } },
      createdBy: { connect: { id: createdById } },
    },
    include: {
      questions: true,
      organization: true,
    },
  });
}

/**
 * Creates a complete test scenario with user, org, and membership
 */
export async function createTestScenario(prisma: TransactionClient) {
  const user = await createTestUser(prisma);
  const organization = await createTestOrganization(prisma);
  const member = await createTestMember(
    prisma,
    user.id,
    organization.id,
    "owner",
  );

  return { user, organization, member };
}

/**
 * Creates a scenario with a job
 */
export async function createTestScenarioWithJob(prisma: TransactionClient) {
  const scenario = await createTestScenario(prisma);
  const job = await createTestJob(
    prisma,
    scenario.organization.id,
    scenario.user.id,
  );

  return { ...scenario, job };
}
