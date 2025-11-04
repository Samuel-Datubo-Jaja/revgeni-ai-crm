import { NextRequest } from "next/server";
import { createYoga } from "graphql-yoga";
import { createSchema } from "graphql-yoga";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
 

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GraphQL Context Type
interface GraphQLContext {
  userId: string | null;
  orgId: string;
}

const typeDefs = `
  enum CompanyStatus { NEW QUALIFIED CONTACTED MEETING PROPOSAL WON LOST }
  enum EventType { CALL EMAIL MEETING NOTE TASK }

  type Company {
    id: ID!
    name: String!
    domain: String
    industry: String
    sizeBand: String
    geography: String
    status: String!
    score: Int
    createdAt: String!
    updatedAt: String!
    people: [Person!]!
    deals: [Deal!]!
    events: [Event!]!
  }

  type Person {
    id: ID!
    fullName: String!
    title: String
    email: String
    phone: String
    linkedin: String
    createdAt: String!
  }

  type Deal {
    id: ID!
    name: String!
    value: Float
    stage: String!
    expectedCloseDate: String 
    description: String
    createdAt: String!
    updatedAt: String!
  }

  type Event {
    id: ID!
    type: String!
    summary: String
    body: String
    at: String!
  }

  type EmailSequence {
    id: ID!
    name: String!
    fromName: String
    fromEmail: String
    steps: String!
    createdAt: String!
  }

  type Query {
    companies(status: String): [Company!]!
    company(id: ID!): Company
    runLeadWorker: [Company!]!
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
    value: Float
    stage: String!
    expectedCloseDate: String    
    description: String 
  }

  input EmailSequenceInput {
    name: String!
    fromName: String!
    fromEmail: String!
    steps: String!
  }

  input ContactInput {
    fullName: String!
    title: String
    email: String
    phone: String
    linkedin: String
  }

  input ActivityInput {
    type: String!
    summary: String!
    body: String
    at: String!
  }

  type BulkCreateResult {
    count: Int!
  }

  type Mutation {
    upsertCompany(input: CompanyInput!): Company!
    updateCompanyStatus(id: ID!, status: String!): Company!
    deleteCompany(id: ID!): Boolean!
    bulkCreateCompanies(companies: [CompanyInput!]!): BulkCreateResult!

    createPerson(input: PersonInput!): Person!
    createEvent(input: EventInput!): Event!
    createDeal(input: DealInput!): Deal!
    createEmailSequence(input: EmailSequenceInput!): EmailSequence!

    runLeadWorker: [Company!]!

    # ✅ NEW: Update full company details
    updateCompanyDetails(
      id: ID!, 
      industry: String, 
      sizeBand: String, 
      geography: String, 
      score: Int,
      status: String
    ): Company!

    addContact(companyId: ID!, input: ContactInput!): Person!
    addDeal(companyId: ID!, input: DealInput!): Deal!
    addActivity(companyId: ID!, input: ActivityInput!): Event!
  }
`;

const resolvers = {
  Query: {
    companies: async (_: unknown, args: { status?: string }, context: GraphQLContext) =>
      prisma.company.findMany({
        where: {
          orgId: context.orgId,
          ...(args.status ? { status: args.status as any } : {}),
        },
        include: {
          people: {
            orderBy: { createdAt: 'desc' }
          },
          deals: {
            orderBy: { createdAt: 'desc' }
          },
          events: {
            orderBy: { at: 'desc' },
            take: 10
          }
        },
        orderBy: { updatedAt: "desc" },
      }),

    company: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      console.log(`🔍 GraphQL: Looking for company ${args.id} in org ${context.orgId}`);
      
      const company = await prisma.company.findFirst({
        where: { 
          id: args.id,
          orgId: context.orgId 
        },
        include: {
          people: {
            orderBy: { createdAt: 'desc' }
          },
          deals: {
            orderBy: { createdAt: 'desc' }
          },
          events: {
            orderBy: { at: 'desc' },
            take: 10
          }
        }
      });

      console.log(`🎯 GraphQL: Company found:`, company ? 'YES' : 'NO');
      
      if (!company) {
        throw new Error(`Company with id ${args.id} not found in organization ${context.orgId}`);
      }

      return company;
    },

    runLeadWorker: async (_: unknown, _args: any, context: GraphQLContext) => {
      await prisma.org.upsert({
        where: { id: context.orgId },
        update: {},
        create: { id: context.orgId, name: "Demo Organization" },
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
          where: { orgId_domain: { orgId: context.orgId, domain: c.domain } },
          update: c,
          create: { ...c, orgId: context.orgId, status: "NEW" },
        });
        created.push(company);
      }
      return created;
    },
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

    updateCompanyStatus: async (_: unknown, args: { id: string; status: string }, context: GraphQLContext) => {
      const updatedCompany = await prisma.company.update({
        where: { id: args.id },
        data: { status: args.status},
        include: {
          people: true,
          deals: true,
          events: true,
        }
      });

      return updatedCompany;
    },

    // ✅ NEW: Update full company details
    updateCompanyDetails: async (_: unknown, args: { 
      id: string; 
      industry?: string; 
      sizeBand?: string; 
      geography?: string; 
      score?: number;
      status?: string;
    }, context: GraphQLContext) => {
      const updateData: any = { updatedAt: new Date() };
      
      if (args.industry !== undefined) updateData.industry = args.industry;
      if (args.sizeBand !== undefined) updateData.sizeBand = args.sizeBand;
      if (args.geography !== undefined) updateData.geography = args.geography;
      if (args.score !== undefined) updateData.score = args.score;
      if (args.status !== undefined) updateData.status = args.status;

      return prisma.company.update({
        where: { id: args.id, orgId: context.orgId },
        data: updateData,
        include: {
          people: { orderBy: { createdAt: 'desc' } },
          deals: { orderBy: { createdAt: 'desc' } },
          events: { orderBy: { at: 'desc' }, take: 10 }
        }
      });
    },

    deleteCompany: async (_: unknown, { id }: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error("Authentication required");
      await prisma.company.delete({ 
        where: { 
          id,
          orgId: ctx.orgId 
        } 
      });
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
          steps: input.steps,
        },
      });
    },

    runLeadWorker: async (_: unknown, _args: any, context: GraphQLContext) => {
      // Delegate to the Query resolver
      return resolvers.Query.runLeadWorker(_, _args, context);
    },

    addContact: async (_: unknown, args: { companyId: string; input: any }, context: GraphQLContext) => {
      return prisma.person.create({
        data: {
          ...args.input,
          companyId: args.companyId,
          orgId: context.orgId,
        }
      });
    },

    addDeal: async (_: unknown, args: { companyId: string; input: any }, context: GraphQLContext) => {
      return prisma.deal.create({
        data: {
          name: args.input.name,
          value: args.input.value,
          stage: args.input.stage,
          expectedCloseDate: args.input.expectedCloseDate ? new Date(args.input.expectedCloseDate) : null,
          description: args.input.description,
          companyId: args.companyId,
          orgId: context.orgId,
        }
      });
    },
    
    addActivity: async (_: unknown, args: { companyId: string; input: any }, context: GraphQLContext) => {
      return prisma.event.create({
        data: {
          ...args.input,
          companyId: args.companyId,
          orgId: context.orgId,
          at: new Date(args.input.at),
        }
      });
    },
  },
};

// Create GraphQL Yoga server
const yoga = createYoga<GraphQLContext>({
  schema: createSchema<GraphQLContext>({ 
    typeDefs, 
    resolvers 
  }),
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Request, Response, fetch },
  context: async () => {
    try {
      const { userId, orgId } = await auth();
      return { 
        orgId: orgId ?? "demo-org", 
        userId: userId ?? null 
      };
    } catch {
      return { 
        orgId: "demo-org", 
        userId: null 
      };
    }
  },
});

// Export route handlers
export async function GET(req: NextRequest) {
  return yoga.fetch(req as unknown as Request);
}

export async function POST(req: NextRequest) {
  return yoga.fetch(req as unknown as Request);
}

export async function OPTIONS(req: NextRequest) {
  return yoga.fetch(req as unknown as Request);
}