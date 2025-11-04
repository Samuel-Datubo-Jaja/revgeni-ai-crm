// src/lib/agents/lead-agent.ts
import { Exa } from "exa-js";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

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
  phone?: string;
  contactInfo?: {
    mainPhone?: string;
    salesPhone?: string;
    supportPhone?: string;
    headquarters?: string;
  };
}

interface RawSearchResult {
  title: string;
  url: string;
  text?: string;
}

interface CompanyForAnalysis {
  title: string;
  url: string;
  text?: string;
}

interface AIGenerateResponse {
  text: string;
}

interface AILeadResponse {
  leads: LeadSearchResult[];
}

interface SearchFilters {
  industry?: string;
  geography?: string;
  size?: "startup" | "mid" | "enterprise";
}

interface SizeMap {
  startup: string;
  mid: string;
  enterprise: string;
}

/**
 * Enhanced AI Agent that finds leads with phone numbers
 */
export async function findLeadsStructured(
  industry?: string,
  geography?: string,
  size?: "startup" | "mid" | "enterprise"
): Promise<LeadSearchResult[]> {
  try {
    console.log("🔍 Enhanced AI Agent: Searching for companies with contact info...");
    
    // Step 1: Search for companies using Exa API
    const rawResults = await searchCompaniesWithExa(industry, geography, size);

    if (rawResults.length === 0) {
      console.log("No companies found");
      return [];
    }

    // Step 2: Enhanced AI analysis including phone number extraction
    console.log("🤖 AI Worker analyzing leads and extracting contact info...");
    const aiScoredLeads = await analyzeLeadsWithContactInfo(rawResults, {
      industry,
      geography,
      size,
    });

    return aiScoredLeads;
  } catch (error) {
    console.error("Enhanced lead finding error:", error);
    throw new Error(
      `Failed to find leads with contact info: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Enhanced Exa search focusing on company contact pages
 */
async function searchCompaniesWithExa(
  industry?: string,
  geography?: string,
  size?: "startup" | "mid" | "enterprise"
): Promise<RawSearchResult[]> {
  // Build enhanced search queries
  const queries: string[] = [];
  
  // Primary query
  const queryParts: string[] = [];
  if (industry) queryParts.push(`${industry} companies`);
  if (geography) queryParts.push(`based in ${geography}`);
  if (size) {
    const sizeMap: SizeMap = {
      startup: "startup (1-50 employees)",
      mid: "mid-market (50-1000 employees)",
      enterprise: "enterprise (1000+ employees)",
    };
    queryParts.push(sizeMap[size]);
  }
  
  const primaryQuery = queryParts.length > 0 
    ? queryParts.join(" ") 
    : "fastest growing technology companies";
    
  queries.push(primaryQuery);
  
  // Contact-focused queries
  if (industry) {
    queries.push(`${industry} companies contact information phone`);
    queries.push(`${industry} company headquarters contact details`);
  }

  console.log(`🔍 Enhanced queries: ${queries.join(' | ')}`);

  // Search with multiple queries for better contact info
  const allResults: RawSearchResult[] = [];
  
  for (const query of queries.slice(0, 2)) { // Limit to 2 queries to avoid rate limits
    try {
      const results = await exa.searchAndContents(query, {
        numResults: 15,
        text: true,
        livecrawl: "never",
        includeDomains: [],
        excludeDomains: ["linkedin.com", "facebook.com", "twitter.com"],
      });
      
      const mappedResults: RawSearchResult[] = results.results.map((result: Record<string, unknown>) => ({
        title: String(result.title || ""),
        url: String(result.url || ""),
        text: result.text ? String(result.text) : undefined,
      }));
      
      allResults.push(...mappedResults);
    } catch (error) {
      console.warn(`Query failed: ${query}`, error);
    }
  }

  // Deduplicate by domain
  const uniqueResults = allResults.reduce((acc: RawSearchResult[], result: RawSearchResult) => {
    const domain = new URL(result.url).hostname;
    if (!acc.find((r: RawSearchResult) => new URL(r.url).hostname === domain)) {
      acc.push(result);
    }
    return acc;
  }, []);

  return uniqueResults.slice(0, 20);
}

/**
 * Enhanced AI analysis with phone number and contact extraction
 */
async function analyzeLeadsWithContactInfo(
  rawResults: RawSearchResult[],
  filters: SearchFilters
): Promise<LeadSearchResult[]> {
  // Format results for AI analysis
  const companiesJson: CompanyForAnalysis[] = rawResults.map((result: RawSearchResult) => ({
    title: result.title,
    url: result.url,
    text: result.text?.substring(0, 1000),
  }));

  // Enhanced prompt for contact information extraction
  const prompt = `You are an expert AI lead researcher specializing in B2B contact extraction. Analyze these companies and extract comprehensive contact information.

FILTERING CRITERIA:
- Industry: ${filters.industry || "Any"}
- Geography: ${filters.geography || "Any"}
- Company Size: ${filters.size || "Any"}

COMPANIES TO ANALYZE:
${JSON.stringify(companiesJson, null, 2)}

YOUR ENHANCED TASK:
1. Extract company information (name, domain, industry, geography, size, employee count)
2. EXTRACT CONTACT INFORMATION:
   - Main phone number (look for "phone:", "tel:", "+1", "(555)", "call us")
   - Sales phone (look for "sales", "business development")
   - Support phone (look for "support", "help", "customer service")
   - Headquarters address
3. Score each company from 0-100 based on:
   - Filter match (40 points)
   - Growth indicators (30 points)
   - Contact information availability (30 points - bonus for complete contact info)

CONTACT EXTRACTION RULES:
- Look for phone patterns: +1-xxx-xxx-xxxx, (xxx) xxx-xxxx, xxx.xxx.xxxx
- Prioritize main/sales numbers over support
- Extract full addresses when available
- Look in "Contact", "About", "Headquarters" sections

Return ONLY valid JSON in this format:

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
      "phone": "+1-555-123-4567",
      "contactInfo": {
        "mainPhone": "+1-555-123-4567",
        "salesPhone": "+1-555-123-4568",
        "supportPhone": "+1-555-123-4569",
        "headquarters": "123 Main St, City, State 12345"
      },
      "reasoning": "Strong match, excellent contact info available"
    }
  ]
}

IMPORTANT:
- Only return valid JSON
- Include phone numbers when found (even partial matches)
- Award higher scores for companies with complete contact info
- Filter out non-company results`;

  try {
    // Call OpenAI with enhanced prompt
    const response = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.3,
      maxOutputTokens: 3000,
    });

    const generateResponse = response as AIGenerateResponse;

    // Parse AI response
    const jsonMatch = generateResponse.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const parsedResponse: AILeadResponse = JSON.parse(jsonMatch[0]);
    const leads: LeadSearchResult[] = parsedResponse.leads
      .filter((lead: LeadSearchResult) => lead.name && lead.domain)
      .map((lead: LeadSearchResult) => ({
        ...lead,
        // Ensure phone is at top level for backward compatibility
        phone: lead.phone || lead.contactInfo?.mainPhone || lead.contactInfo?.salesPhone,
      }))
      .sort((a: LeadSearchResult, b: LeadSearchResult) => b.score - a.score)
      .slice(0, 15);

    // Log contact info success rate
    const leadsWithPhone = leads.filter(lead => lead.phone).length;
    console.log(`✅ Enhanced AI Worker: ${leads.length} leads analyzed, ${leadsWithPhone} with phone numbers (${Math.round(leadsWithPhone/leads.length*100)}% success rate)`);

    return leads;
  } catch (error) {
    console.error("Enhanced AI analysis error:", error);
    throw new Error(
      `Enhanced AI Worker failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}