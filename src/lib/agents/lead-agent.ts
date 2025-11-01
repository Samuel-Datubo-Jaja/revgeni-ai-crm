// src/lib/agents/lead-agent.ts
import { Exa } from "exa-js";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const exa = new Exa(process.env.EXA_API_KEY);

export interface LeadSearchResult {
  name: string;
  domain: string;
  industry: string;
  geography: string;
  size: "startup" | "mid" | "enterprise";
  employees: number;
  score: number;
  url?: string;
  reasoning?: string;
}

/**
 * Find leads using Exa API + Claude AI Worker
 * This is a true AI Agent that:
 * 1. Uses Exa for web search discovery
 * 2. Uses Claude AI to intelligently analyze and score leads
 */
export async function findLeadsStructured(
  industry?: string,
  geography?: string,
  size?: "startup" | "mid" | "enterprise"
): Promise<LeadSearchResult[]> {
  try {
    // Step 1: Search for companies using Exa API
    console.log("🔍 Searching for companies using Exa API...");
    const rawResults = await searchCompaniesWithExa(industry, geography, size);

    if (rawResults.length === 0) {
      console.log("No companies found");
      return [];
    }

    // Step 2: Use Claude AI Worker to analyze and score the results
    console.log("🤖 AI Worker analyzing leads with Claude...");
    const aiScoredLeads = await analyzeLeadsWithAI(rawResults, {
      industry,
      geography,
      size,
    });

    return aiScoredLeads;
  } catch (error) {
    console.error("Lead finding error:", error);
    throw new Error(
      `Failed to find leads: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Step 1: Search companies using Exa API
 */
async function searchCompaniesWithExa(
  industry?: string,
  geography?: string,
  size?: "startup" | "mid" | "enterprise"
): Promise<Array<any>> {
  // Build search query
  const queryParts = [];

  if (industry) {
    queryParts.push(`${industry} companies`);
  }

  if (geography) {
    queryParts.push(`based in ${geography}`);
  }

  if (size) {
    const sizeMap = {
      startup: "startup (1-50 employees)",
      mid: "mid-market (50-1000 employees)",
      enterprise: "enterprise (1000+ employees)",
    };
    queryParts.push(sizeMap[size]);
  }

  // Default if no filters
  const query =
    queryParts.length > 0
      ? queryParts.join(" ")
      : "fastest growing technology companies";

  console.log(`Query: "${query}"`);

  // Search using Exa API
  const results = await exa.searchAndContents(query, {
    numResults: 20,
    text: true,
    livecrawl: "never", // Use cached results for speed
  });

  return results.results;
}

/**
 * Step 2: Use Claude AI Worker to intelligently analyze and score leads
 */
async function analyzeLeadsWithAI(
  rawResults: any[],
  filters: {
    industry?: string;
    geography?: string;
    size?: "startup" | "mid" | "enterprise";
  }
): Promise<LeadSearchResult[]> {
  // Format results for Claude to analyze
  const companiesJson = rawResults.map((result) => ({
    title: result.title,
    url: result.url,
    text: result.text?.substring(0, 500), // Limit text for token efficiency
  }));

  // Create prompt for Claude AI Worker
  const prompt = `You are an expert AI lead researcher. Analyze these companies and score them based on the given criteria.

FILTERING CRITERIA:
- Industry: ${filters.industry || "Any"}
- Geography: ${filters.geography || "Any"}
- Company Size: ${filters.size || "Any"}

COMPANIES TO ANALYZE:
${JSON.stringify(companiesJson, null, 2)}

YOUR TASK:
1. Extract company information (name, domain, industry, geography, size, employee count)
2. Score each company from 0-100 based on:
   - How well it matches the specified filters (40 points max)
   - Company growth indicators (funding, expansion, market position) (30 points max)
   - Business viability and stability (30 points max)
3. Return ONLY valid JSON in this format, no other text:

{
  "leads": [
    {
      "name": "Company Name",
      "domain": "company.com",
      "industry": "Industry Name",
      "geography": "Country/Region",
      "size": "startup|mid|enterprise",
      "employees": 150,
      "score": 85,
      "reasoning": "Brief explanation of why this score"
    }
  ]
}

IMPORTANT:
- Only return valid JSON
- Filter out any non-company results
- Score should reflect fit to the criteria, not just quality
- Include reasoning for each score`;

  try {
    // Call Claude AI Worker via Vercel AI SDK
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.7, // Balanced for analysis
      maxOutputTokens: 2000,
    });

    // Parse Claude's response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);
    const leads: LeadSearchResult[] = parsedResponse.leads
      .filter((lead: any) => lead.name && lead.domain)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 15); // Limit to 15 results

    console.log(`✅ AI Worker analyzed ${leads.length} leads`);
    return leads;
  } catch (error) {
    console.error("Claude AI analysis error:", error);
    throw new Error(
      `AI Worker failed to analyze leads: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}