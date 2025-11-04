"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, User, Mail, Phone, Briefcase, Linkedin } from "lucide-react";

interface AddContactModalProps {
  companyId: string;
  companyName: string;
  onClose: () => void;
}

interface ContactFormData {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  linkedin: string;
}

const ADD_CONTACT_MUTATION = `
  mutation AddContact($companyId: ID!, $input: ContactInput!) {
    addContact(companyId: $companyId, input: $input) {
      id fullName title email phone linkedin createdAt
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

export default function AddContactModal({ companyId, companyName, onClose }: AddContactModalProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    fullName: '',
    title: '',
    email: '',
    phone: '',
    linkedin: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  const addContactMutation = useMutation({
    mutationFn: (data: ContactFormData) => 
      graphqlFetch(ADD_CONTACT_MUTATION, { 
        companyId, 
        input: data 
      }),
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

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (formData.email && !formData.email.includes('@')) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^[\+]?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      addContactMutation.mutate(formData);
    }
  };

  const updateFormData = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

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
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add New Contact</h2>
              <p className="text-sm text-gray-600">Add a contact to {companyName}</p>
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
            {/* Full Name - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateFormData('fullName', e.target.value)}
                  placeholder="John Smith"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.fullName ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <div className="relative">
                <Briefcase size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  placeholder="Chief Technology Officer"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="john.smith@company.com"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            {/* LinkedIn */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Profile</label>
              <div className="relative">
                <Linkedin size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => updateFormData('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/johnsmith"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
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
              disabled={addContactMutation.isPending}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {addContactMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Adding...
                </>
              ) : (
                <>
                  <User size={16} />
                  Add Contact
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}