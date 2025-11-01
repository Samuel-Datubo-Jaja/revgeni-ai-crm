"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "graphql-request";
import { getGqlClient } from "@/lib/gql";
import { Loader2, Check, AlertCircle, X } from "lucide-react";

interface Lead {
  name: string;
  domain: string;
  industry: string;
  geography: string;
  size: string;
  employees: number;
  score: number;
}

interface LeadFinderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BULK_CREATE = gql`
  mutation BulkCreateCompanies($companies: [CompanyInput!]!) {
    bulkCreateCompanies(companies: $companies) {
      count
    }
  }
`;

export function LeadFinderModal({ open, onOpenChange }: LeadFinderModalProps) {
  const queryClient = useQueryClient();
  const [industry, setIndustry] = useState("");
  const [geography, setGeography] = useState("");
  const [size, setSize] = useState<"startup" | "mid" | "enterprise" | "">("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"filter" | "results" | "importing" | "success">(
    "filter"
  );
  const [error, setError] = useState<string | null>(null);

  // Find leads mutation
  const findLeadsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/leads/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: industry || undefined,
          geography: geography || undefined,
          size: size || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to find leads");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setLeads(data.data.leads || []);
      setStep("results");
      // Pre-select high-scoring leads
      const highScoringLeads = data.data.leads
        .filter((lead: Lead) => lead.score > 70)
        .map((lead: Lead) => lead.domain);
      setSelectedLeads(new Set(highScoringLeads));
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to find leads");
    },
  });

  // Import leads mutation
  const importLeadsMutation = useMutation({
    mutationFn: async () => {
      const leadsToImport = leads
        .filter((lead) => selectedLeads.has(lead.domain))
        .map((lead) => ({
          name: lead.name,
          domain: lead.domain,
          industry: lead.industry,
          sizeBand: lead.size,
          geography: lead.geography,
          score: lead.score,
        }));

      const client = getGqlClient();
      const result = await client.request(BULK_CREATE, {
        companies: leadsToImport,
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setStep("success");
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to import leads");
    },
  });

  const handleFindLeads = async () => {
    setError(null);
    findLeadsMutation.mutate();
  };

  const handleImportLeads = async () => {
    setError(null);
    setStep("importing");
    importLeadsMutation.mutate();
  };

  const handleClose = () => {
    if (step === "success") {
      onOpenChange(false);
      // Reset state
      setIndustry("");
      setGeography("");
      setSize("");
      setLeads([]);
      setSelectedLeads(new Set());
      setStep("filter");
      setError(null);
    } else if (!findLeadsMutation.isPending && !importLeadsMutation.isPending) {
      onOpenChange(false);
    }
  };

  const toggleLeadSelection = (domain: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(domain)) {
      newSelected.delete(domain);
    } else {
      newSelected.add(domain);
    }
    setSelectedLeads(newSelected);
  };

  const selectAllLeads = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((lead) => lead.domain)));
    }
  };

  const getSizeColor = (size: string) => {
    switch (size) {
      case "startup":
        return "bg-blue-100 text-blue-800";
      case "mid":
        return "bg-purple-100 text-purple-800";
      case "enterprise":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">🤖 AI Lead Finder</h2>
            <p className="text-sm text-gray-600 mt-1">
              Discover high-quality leads based on industry, geography, and company size
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={findLeadsMutation.isPending || importLeadsMutation.isPending}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === "filter" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="industry" className="block text-sm font-semibold mb-2">
                    Industry (Optional)
                  </label>
                  <input
                    id="industry"
                    type="text"
                    placeholder="e.g., Software, Finance, AI, Healthcare"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="geography" className="block text-sm font-semibold mb-2">
                    Geography (Optional)
                  </label>
                  <input
                    id="geography"
                    type="text"
                    placeholder="e.g., United States, United Kingdom, Germany"
                    value={geography}
                    onChange={(e) => setGeography(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="size" className="block text-sm font-semibold mb-2">
                    Company Size (Optional)
                  </label>
                  <select
                    id="size"
                    value={size}
                    onChange={(e) => setSize(e.target.value as any)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Any size</option>
                    <option value="startup">Startup (1-50 employees)</option>
                    <option value="mid">Mid-market (50-1000 employees)</option>
                    <option value="enterprise">Enterprise (1000+ employees)</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <p className="text-xs text-gray-500">
                💡 Tip: You can use one or more filters. Leave blank for a broader search.
              </p>
            </div>
          )}

          {step === "results" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Found {leads.length} potential leads
                </h3>
                <button
                  onClick={selectAllLeads}
                  className="text-sm px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  {selectedLeads.size === leads.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {leads.map((lead) => (
                  <div
                    key={lead.domain}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => toggleLeadSelection(lead.domain)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.domain)}
                      onChange={() => toggleLeadSelection(lead.domain)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold truncate">{lead.name}</p>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getScoreColor(lead.score)}`}>
                          {lead.score} pts
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 truncate mb-2">{lead.domain}</p>
                      <div className="flex gap-1 flex-wrap">
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          {lead.industry}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          {lead.geography}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${getSizeColor(lead.size)}`}>
                          {lead.size}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          {lead.employees.toLocaleString()} employees
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-lg font-semibold mb-2">Importing leads...</p>
              <p className="text-sm text-gray-600">
                Adding {selectedLeads.size} leads to your pipeline
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Check className="h-8 w-8 text-green-600 mb-4" />
              <p className="text-lg font-semibold mb-2">Success!</p>
              <p className="text-sm text-gray-600">
                Successfully imported {selectedLeads.size} leads to your pipeline
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50 flex gap-3 justify-end">
          {step === "filter" && (
            <>
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFindLeads}
                disabled={
                  findLeadsMutation.isPending || (!industry && !geography && !size)
                }
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {findLeadsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Finding...
                  </>
                ) : (
                  "Find Leads"
                )}
              </button>
            </>
          )}

          {step === "results" && (
            <>
              <button
                onClick={() => {
                  setStep("filter");
                  setLeads([]);
                  setSelectedLeads(new Set());
                  setError(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImportLeads}
                disabled={selectedLeads.size === 0 || importLeadsMutation.isPending}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Import {selectedLeads.size} leads
              </button>
            </>
          )}

          {step === "success" && (
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
