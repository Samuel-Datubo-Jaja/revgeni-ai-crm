import { findLeadsStructured } from "@/lib/agents/lead-agent";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { traceOperation } from "@/lib/langfuse-helpers"; // ← Add this

// Zod schema for request validation
const LeadSearchSchema = z.object({
  industry: z.string().optional().nullable(),
  geography: z.string().optional().nullable(),
  size: z.enum(["startup", "mid", "enterprise"]).optional().nullable(),
});

type LeadSearchInput = z.infer<typeof LeadSearchSchema>;

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body with Zod
    const body = await request.json();
    
    let validated: LeadSearchInput;
    try {
      validated = LeadSearchSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: "Invalid request parameters",
            details: (error as z.ZodError<LeadSearchInput>).issues,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const { industry, geography, size } = validated;

    // Validate that at least one filter is provided
    if (!industry && !geography && !size) {
      return NextResponse.json(
        { error: "At least one filter (industry, geography, or size) is required" },
        { status: 400 }
      );
    }

    // Langfuse Wrapping
    const leads = await traceOperation(
      {
        name: 'lead-finder',
        userId,
        input: { industry, geography, size },
        metadata: { apiVersion: 'v1' },
      },
      () => findLeadsStructured(industry || undefined, geography || undefined, size || undefined)
    );

    return NextResponse.json({
      success: true,
      data: {
        leads,
        count: leads.length,
        filters: { industry, geography, size },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Lead finding error:", error);
    
    // Handle Exa API errors
    if (error instanceof Error && error.message.includes("Exa")) {
      return NextResponse.json(
        {
          error: "Lead search service error",
          message: error.message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to find leads",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Lead finding API is ready",
    usage: "POST with { industry?: string, geography?: string, size?: 'startup' | 'mid' | 'enterprise' }",
    note: "Powered by Exa API for real-time company discovery",
  });
}