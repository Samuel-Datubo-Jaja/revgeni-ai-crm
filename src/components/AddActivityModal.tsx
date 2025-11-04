"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Calendar, Clock, FileText, Phone, Mail, Users } from "lucide-react";
import { formatForAPI } from "@/lib/date-utils";

interface AddActivityModalProps {
  companyId: string;
  companyName: string;
  onClose: () => void;
}

interface ActivityFormData {
  type: string;
  summary: string;
  body: string;
  at: string;
  time: string;
}

const ADD_ACTIVITY_MUTATION = `
  mutation AddActivity($companyId: ID!, $input: ActivityInput!) {
    addActivity(companyId: $companyId, input: $input) {
      id type summary body at createdAt
    }
  }
`;

async function graphqlFetch(query: string, variables: any = {}) {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0]?.message || 'GraphQL Error');
  }

  return result.data;
}

const ACTIVITY_TYPES = [
  { value: 'call', label: 'Phone Call', icon: Phone, color: 'text-green-600' },
  { value: 'email', label: 'Email', icon: Mail, color: 'text-blue-600' },
  { value: 'meeting', label: 'Meeting', icon: Users, color: 'text-purple-600' },
  { value: 'note', label: 'Note', icon: FileText, color: 'text-gray-600' },
  { value: 'task', label: 'Task', icon: Clock, color: 'text-orange-600' }
];

export default function AddActivityModal({ companyId, companyName, onClose }: AddActivityModalProps) {
  const [formData, setFormData] = useState<ActivityFormData>({
    type: 'call',
    summary: '',
    body: '',
    at: new Date().toISOString().split('T')[0], // Today's date
    time: new Date().toTimeString().slice(0, 5) // Current time
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  const addActivityMutation = useMutation({
    mutationFn: (data: ActivityFormData) => {
      // Combine date and time
      const dateTime = new Date(`${data.at}T${data.time}`);
      const processedData = {
        type: data.type,
        summary: data.summary,
        body: data.body,
        at: formatForAPI(dateTime)
      };
      return graphqlFetch(ADD_ACTIVITY_MUTATION, { 
        companyId, 
        input: processedData 
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

    if (!formData.summary.trim()) {
      newErrors.summary = 'Activity summary is required';
    }

    if (!formData.at) {
      newErrors.at = 'Date is required';
    }

    if (!formData.time) {
      newErrors.time = 'Time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      addActivityMutation.mutate(formData);
    }
  };

  const updateFormData = (field: keyof ActivityFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectedActivityType = ACTIVITY_TYPES.find(type => type.value === formData.type);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-purple-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Calendar size={24} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Log Activity</h2>
              <p className="text-sm text-gray-600">Record an interaction with {companyName}</p>
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
            {/* Activity Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
              <div className="grid grid-cols-5 gap-2">
                {ACTIVITY_TYPES.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => updateFormData('type', type.value)}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                        formData.type === type.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <IconComponent size={20} className={type.color} />
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Summary <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.summary}
                onChange={(e) => updateFormData('summary', e.target.value)}
                placeholder={`${selectedActivityType?.label} with ${companyName}...`}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  errors.summary ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.summary && <p className="text-red-500 text-sm mt-1">{errors.summary}</p>}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={formData.at}
                    onChange={(e) => updateFormData('at', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      errors.at ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.at && <p className="text-red-500 text-sm mt-1">{errors.at}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => updateFormData('time', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      errors.time ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time}</p>}
              </div>
            </div>

            {/* Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
              <textarea
                value={formData.body}
                onChange={(e) => updateFormData('body', e.target.value)}
                placeholder="Add notes about this interaction, outcomes, next steps..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
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
              disabled={addActivityMutation.isPending}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {addActivityMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Logging...
                </>
              ) : (
                <>
                  <Calendar size={16} />
                  Log Activity
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}