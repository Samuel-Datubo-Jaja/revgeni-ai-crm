// src/app/api/graphql/route.ts
import { createYoga, createSchema } from "graphql-yoga";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// IMPORTANT for Prisma on Vercel/Next
export const runtime = "nodejs";
// Avoid caching API responses
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** -------------------------
 * GraphQL SDL (unchanged)
 * ------------------------*/
const typeDefs = /* GraphQL */ `
  enum CompanyStatus { NEW QUALIFIED CONTACTED MEETING PROPOSAL WON LOST }
  enum EventType { CALL EMAIL MEETING NOTE TASK }

  type Company {
    id: ID!
    name: String!
    domain: String
    industry: String
    sizeBand: String
    geography: String
    status: CompanyStatus!
    score: Int
    createdAt: String!
    updatedAt: String!
  }

  type Person {
    id: ID!
    companyId: ID!
    fullName: String!
    title: String
    email: String
    linkedin: String
    createdAt: String!
  }

  type Event {
    id: ID!
    type: EventType!
    summary: String
    body: String
    at: String!
  }

  type Deal {
    id: ID!
    companyId: ID!
    name: String!
    value: Int
    stage: String!
    createdAt: String!
    updatedAt: String!
  }

  type EmailSequence {
    id: ID!
    name: String!
    fromName: String
    fromEmail: String
    steps: String!
    createdAt: String!
  }

  type CompanyDetail {
    id: ID!
    name: String!
    domain: String
    industry: String
    sizeBand: String
    geography: String
    status: CompanyStatus!
    score: Int
    people: [Person!]!
    deals: [Deal!]!
    events: [Event!]!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    companies(status: CompanyStatus): [Company!]!
    company(id: ID!): CompanyDetail
  }

  input CompanyInput {
    name: String!
    domain: String
    industry: String
    sizeBand: String
    geography: String
    score: Int
  }

  input PersonInput {
    companyId: ID!
    fullName: String!
    title: String
    email: String
    linkedin: String
  }

  input EventInput {
    companyId: ID
    personId: ID
    dealId: ID
    type: EventType!
    summary: String
    body: String
  }

  input DealInput {
    companyId: ID!
    name: String!
    value: Int
    stage: String!
  }

  input EmailSequenceInput {
    name: String!
    fromName: String!
    fromEmail: String!
    steps: String!
  }

  type BulkCreateResult {
    count: Int!
  }

  type Mutation {
    upsertCompany(input: CompanyInput!): Company!
    updateCompanyStatus(id: ID!, status: CompanyStatus!): Company!
    deleteCompany(id: ID!): Boolean!
    bulkCreateCompanies(companies: [CompanyInput!]!): BulkCreateResult!

    createPerson(input: PersonInput!): Person!
    createEvent(input: EventInput!): Event!
    createDeal(input: DealInput!): Deal!
    createEmailSequence(input: EmailSequenceInput!): EmailSequence!

    runLeadWorker: [Company!]!
  }
`;

type GraphQLContext = {
  orgId: string;
  userId?: string | null;
};

/** -------------------------
 * Resolvers (unchanged)
 * ------------------------*/
const resolvers = {
  Query: {
    companies: async (_: unknown, args: { status?: string }, ctx: GraphQLContext) =>
      prisma.company.findMany({
        where: {
          orgId: ctx.orgId,
          ...(args.status ? { status: args.status as any } : {}),
        },
        orderBy: { updatedAt: "desc" },
      }),

    company: (_: unknown, args: { id: string }, ctx: GraphQLContext) =>
      prisma.company.findFirst({
        where: { id: args.id, orgId: ctx.orgId },
        include: {
          people: true,
          deals: true,
          events: { orderBy: { at: "desc" }, take: 20 },
        },
      }),
  },

  Mutation: {
    upsertCompany: async (_: unknown, { input }: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error("Authentication required");

      if (input.domain) {
        return prisma.company.upsert({
          where: { orgId_domain: { orgId: ctx.orgId, domain: input.domain } },
          update: { ...input },
          create: { ...input, orgId: ctx.orgId, status: "NEW" },
        });
      }
      return prisma.company.create({
        data: { ...input, orgId: ctx.orgId, status: "NEW" },
      });
    },

    updateCompanyStatus: (_: unknown, { id, status }: any) =>
      prisma.company.update({ where: { id }, data: { status } }),

    deleteCompany: async (_: unknown, { id }: any) => {
      await prisma.company.delete({ where: { id } });
      return true;
    },

    bulkCreateCompanies: async (_: unknown, { companies }: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error("Authentication required");

      await prisma.org.upsert({
        where: { id: ctx.orgId },
        update: {},
        create: { id: ctx.orgId, name: "Organization" },
      });

      const result = await prisma.company.createMany({
        data: companies.map((c: any) => ({
          orgId: ctx.orgId,
          name: c.name,
          domain: c.domain,
          industry: c.industry,
          sizeBand: c.sizeBand || c.size,
          geography: c.geography,
          score: c.score || 50,
          status: "NEW",
        })),
        skipDuplicates: true,
      });

      return { count: result.count };
    },

    createPerson: async (_: unknown, { input }: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error("Authentication required");
      return prisma.person.create({
        data: {
          orgId: ctx.orgId,
          companyId: input.companyId,
          fullName: input.fullName,
          title: input.title,
          email: input.email,
          linkedin: input.linkedin,
        },
      });
    },

    createEvent: async (_: unknown, { input }: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error("Authentication required");
      return prisma.event.create({
        data: {
          orgId: ctx.orgId,
          companyId: input.companyId,
          personId: input.personId,
          dealId: input.dealId,
          type: input.type,
          summary: input.summary,
          body: input.body,
          at: new Date(),
        },
      });
    },

    createDeal: async (_: unknown, { input }: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error("Authentication required");
      return prisma.deal.create({
        data: {
          orgId: ctx.orgId,
          companyId: input.companyId,
          name: input.name,
          value: input.value,
          stage: input.stage,
        },
      });
    },

    createEmailSequence: async (_: unknown, { input }: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error("Authentication required");
      return prisma.emailSequence.create({
        data: {
          orgId: ctx.orgId,
          name: input.name,
          fromName: input.fromName,
          fromEmail: input.fromEmail,
          // NOTE: keep as string if your Prisma field is String
          // If your Prisma field is Json, convert to JSON object
          steps: input.steps,
        },
      });
    },

    runLeadWorker: async (_: unknown, _args: any, ctx: GraphQLContext) => {
      await prisma.org.upsert({
        where: { id: ctx.orgId },
        update: {},
        create: { id: ctx.orgId, name: "Demo Organization" },
      });

      const demo = [
        { name: "Acme FinTech", domain: "acme.example", industry: "FinTech", sizeBand: "51-200", geography: "UK", score: 70 },
        { name: "Northwind AI", domain: "northwind.example", industry: "AI Consulting", sizeBand: "11-50", geography: "UK", score: 65 },
        { name: "CloudSync Solutions", domain: "cloudsync.example", industry: "Cloud Computing", sizeBand: "201-500", geography: "United States", score: 75 },
        { name: "DataVault Analytics", domain: "datavault.example", industry: "Data Analytics", sizeBand: "51-200", geography: "Germany", score: 80 },
        { name: "NeuroTech Innovations", domain: "neurotech.example", industry: "Artificial Intelligence", sizeBand: "1001+", geography: "United States", score: 85 },
        { name: "HealthPulse Digital", domain: "healthpulse.example", industry: "Healthcare Tech", sizeBand: "201-500", geography: "Canada", score: 72 },
      ];

      const created: any[] = [];
      for (const c of demo) {
        const company = await prisma.company.upsert({
          where: { orgId_domain: { orgId: ctx.orgId, domain: c.domain } },
          update: c,
          create: { ...c, orgId: ctx.orgId, status: "NEW" },
        });
        created.push(company);
      }
      return created;
    },
  },
};

/** -------------------------
 * Yoga server
 * ------------------------*/
const yoga = createYoga<GraphQLContext>({
  schema: createSchema<GraphQLContext>({ typeDefs, resolvers }),
  graphqlEndpoint: "/api/graphql",
  // Use Next's fetch/Request/Response
  fetchAPI: { Request, Response, fetch },
  context: async () => {
    try {
      const { userId, orgId } = await auth();
      return { orgId: orgId ?? "demo-org", userId };
    } catch {
      return { orgId: "demo-org", userId: null };
    }
  },
});

// ✅ Next 16 route handler signatures (note the second arg with params Promise)
export async function GET(req: NextRequest, _ctx: { params: Promise<Record<string, string>> }) {
  return yoga.fetch(req as unknown as Request);
}

export async function POST(req: NextRequest, _ctx: { params: Promise<Record<string, string>> }) {
  return yoga.fetch(req as unknown as Request);
}

export async function OPTIONS(req: NextRequest, _ctx: { params: Promise<Record<string, string>> }) {
  return yoga.fetch(req as unknown as Request);
}
