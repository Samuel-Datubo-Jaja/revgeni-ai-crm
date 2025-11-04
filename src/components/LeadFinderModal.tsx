"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "graphql-request";
import { getGqlClient } from "@/lib/gql";
import { Loader2, Check, AlertCircle, X, Search, Building, MapPin, Users, Star, Download } from "lucide-react";

interface Lead {
  name: string;
  domain: string;
  industry: string;
  geography: string;
  size: string;
  employees: number | null;
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Modern Design */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
              <Search size={28} className="text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-gray-900">AI Lead Finder</h2>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  🤖 Powered by AI
                </span>
              </div>
              <p className="text-gray-600">
                Discover high-quality leads based on your criteria
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            disabled={findLeadsMutation.isPending || importLeadsMutation.isPending}
            className="p-3 hover:bg-white/70 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* AI Banner */}
        <div className="p-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔍</span>
            </div>
            <div>
              <h3 className="text-xl font-bold">Intelligent Lead Discovery</h3>
              <p className="text-blue-100">
                {step === "filter" && "Configure your search criteria to find the best leads"}
                {step === "results" && `Found ${leads.length} potential leads matching your criteria`}
                {step === "importing" && "Adding selected leads to your CRM pipeline"}
                {step === "success" && "Successfully imported leads to your pipeline"}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {step === "filter" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold mb-4 text-blue-900 flex items-center gap-2">
                  <Building size={20} />
                  Search Criteria
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry (Optional)
                    </label>
                    <div className="relative">
                      <Building size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="e.g., Software, Finance, AI, Healthcare"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Geography (Optional)
                    </label>
                    <div className="relative">
                      <MapPin size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="e.g., United States, United Kingdom, Germany"
                        value={geography}
                        onChange={(e) => setGeography(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Size (Optional)
                    </label>
                    <div className="relative">
                      <Users size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <select
                        value={size}
                        onChange={(e) => setSize(e.target.value as any)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                      >
                        <option value="">Any size</option>
                        <option value="startup">Startup (1-50 employees)</option>
                        <option value="mid">Mid-market (50-1000 employees)</option>
                        <option value="enterprise">Enterprise (1000+ employees)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <span className="text-lg">💡</span>
                    <strong>Tip:</strong> Leave fields blank for broader results. More specific criteria = higher quality matches.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === "results" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Found {leads.length} High-Quality Leads
                  </h3>
                  <p className="text-gray-600">Select leads to import to your pipeline</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={selectAllLeads}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                  >
                    {selectedLeads.size === leads.length ? "Deselect All" : "Select All"}
                  </button>
                  <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                    {selectedLeads.size} selected
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {leads.map((lead) => (
                  <div
                    key={lead.domain}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                      selectedLeads.has(lead.domain)
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => toggleLeadSelection(lead.domain)}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedLeads.has(lead.domain)}
                        onChange={() => toggleLeadSelection(lead.domain)}
                        className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">{lead.name}</h4>
                            <p className="text-sm text-gray-600">{lead.domain}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star size={16} className="text-yellow-500" />
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(lead.score)}`}>
                              {lead.score} pts
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 flex-wrap">
                          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                            {lead.industry}
                          </span>
                          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                            {lead.geography}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSizeColor(lead.size)}`}>
                            {lead.size}
                          </span>
                          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                            {lead.employees ? lead.employees.toLocaleString() : 'Unknown'} employees
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Importing Leads...</h3>
              <p className="text-gray-600 text-center max-w-md">
                Adding {selectedLeads.size} high-quality leads to your CRM pipeline. This may take a moment.
              </p>
              <div className="mt-6 w-64 bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Success! 🎉</h3>
              <p className="text-gray-600 text-center max-w-md mb-6">
                Successfully imported {selectedLeads.size} leads to your pipeline. They're now ready for outreach!
              </p>
              <div className="flex gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{selectedLeads.size}</div>
                  <div className="text-sm text-blue-800">Leads Added</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(leads.filter(l => selectedLeads.has(l.domain)).reduce((sum, l) => sum + l.score, 0) / selectedLeads.size)}
                  </div>
                  <div className="text-sm text-green-800">Avg Score</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Modern Design */}
        <div className="p-6 border-t bg-gradient-to-r from-gray-50 to-gray-100 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              step === "importing" ? 'bg-blue-500' : 
              step === "success" ? 'bg-green-500' : 'bg-purple-500'
            }`}></div>
            <span className="text-sm font-medium text-gray-700">
              {step === "filter" && "🔍 Configure your search criteria"}
              {step === "results" && `📊 ${leads.length} leads found • ${selectedLeads.size} selected`}
              {step === "importing" && "⏳ Importing leads to your CRM"}
              {step === "success" && "✅ Import completed successfully"}
            </span>
          </div>
          
          <div className="flex gap-3">
            {step === "filter" && (
              <>
                <button
                  onClick={() => onOpenChange(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFindLeads}
                  disabled={findLeadsMutation.isPending || (!industry && !geography && !size)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
                >
                  {findLeadsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search size={16} />
                      Find Leads
                    </>
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
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Back to Search
                </button>
                <button
                  onClick={handleImportLeads}
                  disabled={selectedLeads.size === 0 || importLeadsMutation.isPending}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
                >
                  <Download size={16} />
                  Import {selectedLeads.size} Leads
                </button>
              </>
            )}

            {step === "success" && (
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
              >
                <Check size={16} />
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
