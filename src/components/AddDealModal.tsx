"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, DollarSign, Target, Calendar } from "lucide-react";

interface AddDealModalProps {
  companyId: string;
  companyName: string;
  onClose: () => void;
}

interface DealFormData {
  name: string;
  value: string;
  stage: string;
  expectedCloseDate: string;
  description: string;
}

interface GraphQLVariables {
  companyId?: string;
  input?: Record<string, unknown>;
  [key: string]: unknown;
}

interface GraphQLResponse {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string }>;
}

// ✅ CORRECT: companyId as SEPARATE argument (matches your resolver)
const ADD_DEAL_MUTATION = `
  mutation AddDeal($companyId: ID!, $input: DealInput!) {
    addDeal(companyId: $companyId, input: $input) {
      id name value stage expectedCloseDate description createdAt
    }
  }
`;

async function graphqlFetch(query: string, variables: GraphQLVariables = {}) {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
  }

  const result: GraphQLResponse = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0]?.message || 'GraphQL Error');
  }

  return result.data;
}

const DEAL_STAGES = [
  'Lead',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost'
];

export default function AddDealModal({ companyId, companyName, onClose }: AddDealModalProps) {
  const [formData, setFormData] = useState<DealFormData>({
    name: '',
    value: '',
    stage: 'Lead',
    expectedCloseDate: '',
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  const addDealMutation = useMutation({
    mutationFn: (data: DealFormData) => {
      // ✅ CORRECT: Build input WITHOUT companyId
      const processedData = {
        name: data.name,
        value: data.value ? parseFloat(data.value.replace(/[^\d.]/g, '')) : null,
        stage: data.stage,
        expectedCloseDate: data.expectedCloseDate || null,
        description: data.description || null
      };
      
      // ✅ CORRECT: Pass companyId and input as SEPARATE variables
      return graphqlFetch(ADD_DEAL_MUTATION, { 
        companyId,           // ← Separate variable
        input: processedData as Record<string, unknown> // ← Cast to proper type
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      onClose();
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message });
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Deal name is required';
    }

    if (formData.value && isNaN(parseFloat(formData.value.replace(/[^\d.]/g, '')))) {
      newErrors.value = 'Please enter a valid amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validateForm()) {
      addDealMutation.mutate(formData);
    }
  };

  const updateFormData = (field: keyof DealFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^\d.]/g, '');
    if (numericValue) {
      const formatted = parseFloat(numericValue).toLocaleString();
      return `$${formatted}`;
    }
    return value;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-50 to-green-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign size={24} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create New Deal</h2>
              <p className="text-sm text-gray-600">Add a sales opportunity for {companyName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/70 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Deal Name - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="Enterprise Software Implementation"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Deal Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deal Value</label>
                <div className="relative">
                  <DollarSign size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.value}
                    onChange={(e) => updateFormData('value', e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        updateFormData('value', formatCurrency(e.target.value));
                      }
                    }}
                    placeholder="50000"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.value ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.value && <p className="text-red-500 text-sm mt-1">{errors.value}</p>}
              </div>

              {/* Stage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                <div className="relative">
                  <Target size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                  <select
                    value={formData.stage}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateFormData('stage', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none bg-white"
                  >
                    {DEAL_STAGES.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Expected Close Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label>
              <div className="relative">
                <Calendar size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={formData.expectedCloseDate}
                  onChange={(e) => updateFormData('expectedCloseDate', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Describe the opportunity, requirements, or key details..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              />
            </div>
          </div>

          {/* Error Display */}
          {errors.submit && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addDealMutation.isPending}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {addDealMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <DollarSign size={16} />
                  Create Deal
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}