"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { X, Mail, Users, Search, CheckCircle, Loader2, Building } from 'lucide-react';

interface CompanyAssignmentModalProps {
  open: boolean;
  onClose: () => void;
}

interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  leadScore?: number;
}

interface EmailSequence {
  id: string;
  name: string;
  fromEmail: string;
  fromName: string;
  createdAt: string;
  steps?: Array<{
    id: string;
    stepNumber: number;
    delayDays: number;
    subject: string;
    body: string;
  }>;
}

interface GraphQLQueryBody {
  query: string;
  variables?: Record<string, unknown>;
}

interface GraphQLResponse {
  data?: { companies?: Company[] };
  errors?: Array<{ message: string }>;
}

export function CompanyAssignmentModal({ open, onClose }: CompanyAssignmentModalProps) {
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedSequence, setSelectedSequence] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  // Fetch companies
  const { data: companies = [], isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: async () => {
      const body: GraphQLQueryBody = {
        query: `
          query GetCompanies {
            companies {
              id
              name
              domain
              industry
              score
            }
          }
        `
      };

      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const result: GraphQLResponse = await response.json();
      return result.data?.companies || [];
    },
    enabled: open,
  });

  // Fetch sequences
  const { data: sequences = [], isLoading: sequencesLoading } = useQuery<EmailSequence[]>({
    queryKey: ['emailSequences'],
    queryFn: async () => {
      try {
        console.log('🔍 Fetching sequences from direct API...');
        
        const response = await fetch('/api/email-sequences');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const sequences: EmailSequence[] = await response.json();
        console.log('✅ Fetched sequences:', sequences);
        console.log('📊 Count:', sequences.length);
        
        return sequences;
      } catch (error) {
        console.error('❌ Error fetching sequences:', error);
        throw error;
      }
    },
    enabled: open,
    retry: 3,
  });

  // Log sequences when they change
  useEffect(() => {
    console.log('🔍 Modal - Sequences updated:', sequences);
    console.log('🔍 Modal - Sequences loading:', sequencesLoading);
    console.log('🔍 Modal - Sequences length:', sequences.length);
  }, [sequences, sequencesLoading]);

  // Filter companies based on search
  const filteredCompanies = companies.filter((company: Company) => 
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Assignment mutation with proper auth
  const assignMutation = useMutation({
    mutationFn: async () => {
      console.log('🚀 Starting assignment...');
      console.log('📋 Companies:', selectedCompanies);
      console.log('📧 Sequence:', selectedSequence);
      
      const response = await fetch('/api/assign-companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          companyIds: selectedCompanies,
          sequenceId: selectedSequence,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ API Error:', data);
        throw new Error(data.error || 'Failed to assign companies');
      }

      return data;
    },
    onSuccess: (data: Record<string, unknown>) => {
      console.log('✅ Assignment successful:', data);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-sequences'] });
      
      // Show success message
      alert(`✅ Successfully assigned ${data.assigned} companies!`);
      
      // Close modal
      onClose();
    },
    onError: (error: Error) => {
      console.error('❌ Assignment error:', error);
      alert(`❌ ${error.message}`);
    },
  });

  // Don't render if user not authenticated
  if (!userId && open) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl p-8 text-center">
          <p className="text-red-600 font-semibold">Please sign in to continue</p>
        </div>
      </div>
    );
  }

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedCompanies.length === filteredCompanies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(filteredCompanies.map(c => c.id));
    }
  };

  const selectedSequenceData = sequences.find((s: EmailSequence) => s.id === selectedSequence);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-green-50 via-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center">
                <Users className="text-green-600" size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Assign Companies to Email Sequence</h3>
                <p className="text-gray-600 mt-1">Select companies and choose an automated email sequence</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 hover:bg-white/70 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content - Two Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Company Selection */}
          <div className="w-3/5 border-r flex flex-col bg-gray-50">
            <div className="p-6 border-b bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Building size={20} className="text-gray-600" />
                  <h4 className="text-lg font-semibold">Select Companies</h4>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    {selectedCompanies.length} selected
                  </span>
                </div>
                
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  {selectedCompanies.length === filteredCompanies.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  placeholder="Search companies by name, domain, or industry..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            {/* Company List - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4">
              {companiesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-gray-400" size={32} />
                  <span className="ml-3 text-gray-600">Loading companies...</span>
                </div>
              ) : filteredCompanies.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Building className="mx-auto mb-3" size={48} />
                  <p className="text-lg mb-2">No companies found</p>
                  <p className="text-sm">Try adjusting your search terms</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredCompanies.map((company: Company) => (
                    <div
                      key={company.id}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        selectedCompanies.includes(company.id)
                          ? 'border-green-300 bg-green-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                      }`}
                      onClick={() => {
                        if (selectedCompanies.includes(company.id)) {
                          setSelectedCompanies(selectedCompanies.filter(id => id !== company.id));
                        } else {
                          setSelectedCompanies([...selectedCompanies, company.id]);
                        }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedCompanies.includes(company.id)}
                          onChange={() => {}} // Handled by div click
                          className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h5 className="font-semibold text-gray-900">{company.name}</h5>
                            {company.leadScore && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                company.leadScore >= 80 ? 'bg-green-100 text-green-800' :
                                company.leadScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                Score {company.leadScore}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">{company.domain}</div>
                          <div className="text-xs text-gray-500 mt-1">{company.industry}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Sequence Selection & Summary */}
          <div className="w-2/5 flex flex-col bg-white">
            <div className="p-6 border-b">
              <div className="flex items-center gap-2 mb-4">
                <Mail size={20} className="text-gray-600" />
                <h4 className="text-lg font-semibold">Choose Email Sequence</h4>
                {/* Debug info */}
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {sequencesLoading ? 'Loading...' : `${sequences.length} found`}
                </span>
              </div>
              
              {sequencesLoading ? (
                <div className="flex items-center py-4">
                  <Loader2 className="animate-spin text-gray-400" size={20} />
                  <span className="ml-2 text-gray-600">Loading sequences...</span>
                </div>
              ) : sequences.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 text-sm font-semibold">
                    🚨 No sequences found in modal!
                  </p>
                  <p className="text-yellow-700 text-xs mt-1">
                    API works but modal not getting data. Check console for debug info.
                  </p>
                  <button
                    onClick={() => {
                      console.log('🔄 Manual refresh clicked');
                      queryClient.invalidateQueries({ queryKey: ['emailSequences'] });
                      queryClient.refetchQueries({ queryKey: ['emailSequences'] });
                    }}
                    className="mt-2 px-3 py-1 text-xs bg-yellow-200 hover:bg-yellow-300 rounded"
                  >
                    🔄 Refresh Sequences
                  </button>
                </div>
              ) : (
                <>
                  {/* Success message */}
                  <div className="mb-3 text-xs text-green-600 font-medium">
                    ✅ Found {sequences.length} sequences: {sequences.map(s => s.name).join(', ')}
                  </div>
                  
                  <select
                    value={selectedSequence}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSequence(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select an email sequence...</option>
                    {sequences.map((seq: EmailSequence) => (
                      <option key={seq.id} value={seq.id}>
                        {seq.name} (ID: {seq.id.slice(-6)})
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {/* Sequence Details */}
            {selectedSequenceData && (
              <div className="p-6 border-b bg-blue-50">
                <h5 className="font-semibold text-blue-900 mb-3">Sequence Details</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Name:</span>
                    <span className="font-medium text-blue-900">{selectedSequenceData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">From:</span>
                    <span className="font-medium text-blue-900">
                      {selectedSequenceData.fromName} &lt;{selectedSequenceData.fromEmail}&gt;
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Created:</span>
                    <span className="font-medium text-blue-900">
                      {new Date(selectedSequenceData.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Assignment Summary */}
            <div className="flex-1 p-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                <h5 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
                  <CheckCircle size={18} />
                  Assignment Summary
                </h5>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-700">Companies selected:</span>
                    <span className="font-bold text-2xl text-purple-900">{selectedCompanies.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-700">Email sequence:</span>
                    <span className="font-medium text-purple-900">
                      {selectedSequence ? '✅ Selected' : '⏳ Choose sequence'}
                    </span>
                  </div>
                </div>

                {selectedCompanies.length > 0 && selectedSequence && (
                  <div className="mt-4 p-4 bg-green-100 rounded-lg border border-green-300">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="font-semibold text-green-900">Ready to Launch!</span>
                    </div>
                    <p className="text-sm text-green-800">
                      <strong>{selectedCompanies.length}</strong> companies will be enrolled in 
                      "<strong>{selectedSequenceData?.name}</strong>" and will start receiving 
                      automated emails according to the sequence schedule.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedCompanies.length > 0 && selectedSequence ? (
              <span className="text-green-600 font-medium">
                ✅ Ready to assign {selectedCompanies.length} companies to email sequence
              </span>
            ) : (
              <span>Select companies and choose a sequence to continue</span>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={assignMutation.isPending}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => assignMutation.mutate()}
              disabled={selectedCompanies.length === 0 || !selectedSequence || assignMutation.isPending}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Users size={18} />
                  Assign {selectedCompanies.length} Companies
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}