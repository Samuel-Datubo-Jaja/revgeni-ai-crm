"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignCompanyToSequence } from '@/lib/sequence-assignment';
import { X, Mail, Loader2, CheckCircle, Calendar, Users } from 'lucide-react';

interface CompanySequenceAssignmentProps {
  open: boolean;
  onClose: () => void;
  selectedCompanies: string[];
  onAssignComplete: () => void;
}

export function CompanySequenceAssignment({ 
  open, 
  onClose, 
  selectedCompanies, 
  onAssignComplete 
}: CompanySequenceAssignmentProps) {
  const [selectedSequenceId, setSelectedSequenceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch available email sequences
  const { data: sequences = [], isLoading: sequencesLoading } = useQuery<EmailSequence[]>({
    queryKey: ['emailSequences'],
    queryFn: async () => {
      try {
        console.log('🔍 Fetching sequences from direct API...');
        
        const response = await fetch('/api/email-sequences');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const sequences = await response.json();
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

  // Get selected sequence details
  const selectedSequence = sequences.find(s => s.id === selectedSequenceId);

  // Mutation to assign companies to sequence
  const assignMutation = useMutation({
    mutationFn: async () => {
      const orgId = 'default-org'; // Replace with actual org ID from auth context
      setError(null);
      
      // Assign each selected company to the sequence
      const results = [];
      for (const companyId of selectedCompanies) {
        try {
          const result = await assignCompanyToSequence(companyId, selectedSequenceId, orgId);
          results.push(result);
        } catch (err) {
          console.error(`Failed to assign company ${companyId}:`, err);
          throw new Error(`Failed to assign some companies to sequence`);
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      console.log(`✅ Successfully assigned ${results.length} companies to sequence`);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companySequences'] });
      onAssignComplete();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to assign companies to sequence');
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Mail className="text-purple-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Assign Email Sequence</h3>
                <p className="text-gray-600">Start automated email campaigns for selected companies</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/70 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          {/* Selected Companies Summary */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-blue-600" size={20} />
              <h4 className="font-semibold text-blue-900">Selected Companies</h4>
            </div>
            <p className="text-blue-800">
              <span className="font-bold">{selectedCompanies.length}</span> companies will be enrolled in the email sequence
            </p>
          </div>

          {/* Sequence Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose Email Sequence *
            </label>
            
            {sequencesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-gray-400" size={24} />
                <span className="ml-2 text-gray-600">Loading sequences...</span>
              </div>
            ) : sequences.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Mail className="mx-auto mb-2" size={48} />
                <p>No email sequences found</p>
                <p className="text-sm">Create a sequence first using the Email Sequence Builder</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sequences.map((sequence) => (
                  <div
                    key={sequence.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedSequenceId === sequence.id
                        ? 'border-purple-300 bg-purple-50 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedSequenceId(sequence.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={selectedSequenceId === sequence.id}
                        onChange={() => setSelectedSequenceId(sequence.id)}
                        className="text-purple-600"
                      />
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-900">{sequence.name}</h5>
                        <p className="text-sm text-gray-600">
                          From: {sequence.fromName} &lt;{sequence.fromEmail}&gt;
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {new Date(sequence.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sequence Preview */}
          {selectedSequence && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="text-green-600" size={16} />
                <h5 className="font-semibold text-green-900">Ready to Start</h5>
              </div>
              <p className="text-green-800 text-sm">
                Companies will be enrolled in "<strong>{selectedSequence.name}</strong>" sequence
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-green-700">
                <Calendar size={14} />
                <span>Emails will be sent according to the sequence schedule</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-2">
                <X className="text-red-600 flex-shrink-0" size={16} />
                <div className="text-red-800 text-sm">{error}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={assignMutation.isPending}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => assignMutation.mutate()}
            disabled={!selectedSequenceId || assignMutation.isPending || selectedCompanies.length === 0}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Mail size={16} />
                Start Email Sequence
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}