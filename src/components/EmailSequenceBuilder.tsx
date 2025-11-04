"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "graphql-request";
import { getGqlClient } from "@/lib/gql";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  X, 
  Mail, 
  Clock, 
  Calendar, 
  Target,
  User,
  Building,
  Zap,
  CheckCircle,
  BarChart3,
  Send
} from "lucide-react";

interface EmailStep {
  id: string;
  delay: number;
  subject: string;
  body: string;
}

interface EmailSequenceBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMAIL_TEMPLATES = [
  {
    id: "intro",
    name: "Introduction",
    subject: "Quick thought about {{company_name}}",
    body: "Hi {{contact_name}},\n\nCame across {{company_name}} and was impressed by your work in {{industry}}.\n\nWould you be open to a brief chat?\n\nBest",
  },
  {
    id: "follow-up",
    name: "Follow-up",
    subject: "Following up - {{company_name}}",
    body: "Hi {{contact_name}},\n\nJust following up on my previous email.\n\nThink there could be a great fit.\n\nLooking forward to connecting!\n\nBest",
  },
  {
    id: "value",
    name: "Value Prop",
    subject: "How we helped similar companies",
    body: "Hi {{contact_name}},\n\nRecently helped companies like {{company_name}} achieve:\n- 30% productivity boost\n- 20% cost reduction\n- Better team collaboration\n\nInterested?\n\nBest",
  },
  {
    id: "case-study",
    name: "Case Study",
    subject: "Case study: {{industry}} success",
    body: "Hi {{contact_name}},\n\nThought you might find this relevant.\n\nSimilar company grew revenue 40% in 6 months.\n\n[View Case Study]\n\nBest",
  },
  {
    id: "close",
    name: "Final Close",
    subject: "Last chance to chat",
    body: "Hi {{contact_name}},\n\nThis is my last attempt to reach out.\n\nIf interested, would love a quick call.\n\nIf not, all the best!\n\nBest",
  },
];

const CREATE_SEQUENCE = gql`
  mutation CreateEmailSequence($input: EmailSequenceInput!) {
    createEmailSequence(input: $input) {
      id
      name
    }
  }
`;

interface SendTestEmailParams {
  email: string;
  step: EmailStep;
}

interface TestEmailResponse {
  success: boolean;
  [key: string]: unknown;
}

export function EmailSequenceBuilder({
  open,
  onOpenChange,
}: EmailSequenceBuilderProps) {
  const queryClient = useQueryClient();
  const [sequenceName, setSequenceName] = useState("");
  const [fromName, setFromName] = useState("Sales Team");
  const [fromEmail, setFromEmail] = useState("");
  const [steps, setSteps] = useState<EmailStep[]>([
    { id: "1", delay: 0, subject: "", body: "" },
  ]);
  const [editingStepId, setEditingStepId] = useState<string>("1");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [testEmail, setTestEmail] = useState("");
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);

  const saveSequenceMutation = useMutation({
    mutationFn: async () => {
      const client = getGqlClient();
      return await client.request(CREATE_SEQUENCE, {
        input: {
          name: sequenceName,
          fromName,
          fromEmail,
          steps: JSON.stringify(steps),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailSequences"] });
      onOpenChange(false);
      // Reset
      setSequenceName("");
      setFromName("Sales Team");
      setFromEmail("");
      setSteps([{ id: "1", delay: 0, subject: "", body: "" }]);
      setEditingStepId("1");
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to save sequence");
    },
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: async ({ email, step }: SendTestEmailParams): Promise<TestEmailResponse> => {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: step.subject,
          body: step.body,
          fromName,
          companyName: 'Test Company',
          contactName: 'Test Contact',
          industry: 'Technology',
          delayDays: step.delay,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send test email');
      }

      return response.json();
    },
    onSuccess: () => {
      console.log('✅ Test email sent');
      setShowTestEmailModal(false);
      setTestEmail("");
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to send test email");
    },
  });

  const handleAddStep = () => {
    const newId = String(Math.max(...steps.map((s) => parseInt(s.id))) + 1);
    setSteps([
      ...steps,
      {
        id: newId,
        delay: 3,
        subject: "",
        body: "",
      },
    ]);
    setEditingStepId(newId);
  };

  const handleRemoveStep = (id: string) => {
    if (steps.length > 1) {
      setSteps(steps.filter((s) => s.id !== id));
      if (editingStepId === id) {
        setEditingStepId(steps[0].id);
      }
    }
  };

  const handleUpdateStep = (id: string, field: string, value: unknown) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleApplyTemplate = (templateId: string) => {
    const template = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (template && editingStepId) {
      handleUpdateStep(editingStepId, "subject", template.subject);
      handleUpdateStep(editingStepId, "body", template.body);
      setSelectedTemplate(templateId);
    }
  };

  const handleSendTestEmail = () => {
    const currentStep = steps.find(s => s.id === editingStepId);
    if (currentStep && testEmail && currentStep.subject && currentStep.body) {
      sendTestEmailMutation.mutate({ 
        email: testEmail, 
        step: currentStep 
      });
    }
  };

  const editingStep = steps.find((s) => s.id === editingStepId);
  const completionRate = Math.round(
    (steps.filter((s) => s.subject && s.body).length / steps.length) * 100
  );

  const totalDuration = steps.reduce((sum, s) => sum + s.delay, 0);
  const isValid =
    sequenceName && fromEmail && steps.every((s) => s.subject && s.body);

  if (!open) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={() => onOpenChange(false)}
      >
        <div 
          className="bg-white rounded-2xl shadow-xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden"
          onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        >
          {/* Header - Modern Design */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                <Mail size={28} className="text-purple-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-gray-900">Email Sequence Builder</h2>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                    ⚡ Automated
                  </span>
                </div>
                <p className="text-gray-600">
                  Create automated email sequences to nurture leads
                </p>
              </div>
            </div>
            
            <button
              onClick={() => onOpenChange(false)}
              disabled={saveSequenceMutation.isPending}
              className="p-3 hover:bg-white/70 rounded-full transition-colors disabled:opacity-50"
            >
              <X size={24} />
            </button>
          </div>

          {/* AI Banner */}
          <div className="p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Zap size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Smart Email Automation</h3>
                <p className="text-purple-100">
                  Design personalized email sequences with AI-powered templates
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8">
            {/* Sequence Details - Modern Card */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 mb-8">
              <h3 className="text-lg font-semibold mb-4 text-purple-900 flex items-center gap-2">
                <Target size={20} />
                Sequence Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="seq-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Sequence Name *
                  </label>
                  <div className="relative">
                    <Target size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      id="seq-name"
                      placeholder="e.g., Cold Outreach - Enterprise"
                      value={sequenceName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSequenceName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="from-email" className="block text-sm font-medium text-gray-700 mb-2">
                    From Email *
                  </label>
                  <div className="relative">
                    <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      id="from-email"
                      type="email"
                      placeholder="sales@company.com"
                      value={fromEmail}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFromEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="from-name" className="block text-sm font-medium text-gray-700 mb-2">
                    From Name *
                  </label>
                  <div className="relative">
                    <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      id="from-name"
                      placeholder="Your Name"
                      value={fromName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFromName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <X className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Email Steps - Modern Layout */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail size={20} className="text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Email Sequence Steps</h3>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                      {steps.length} step{steps.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {editingStep && editingStep.subject && editingStep.body && (
                      <button
                        onClick={() => setShowTestEmailModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                      >
                        <Send size={16} />
                        Send Email
                      </button>
                    )}
                    <button
                      onClick={handleAddStep}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                    >
                      <Plus size={16} />
                      Add Step
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Step List - Enhanced */}
                  <div className="lg:col-span-1">
                    <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                      <BarChart3 size={16} />
                      Sequence Timeline
                    </h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {steps.map((step, index) => (
                        <div
                          key={step.id}
                          className={`relative p-4 rounded-xl cursor-pointer transition-all border-2 ${
                            editingStepId === step.id
                              ? "border-purple-300 bg-purple-50 shadow-md"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                          }`}
                          onClick={() => setEditingStepId(step.id)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">Step {index + 1}</p>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock size={12} />
                                  {step.delay === 0 ? 'Immediate' : `+${step.delay} day${step.delay > 1 ? 's' : ''}`}
                                </div>
                              </div>
                            </div>
                            {steps.length > 1 && (
                              <button
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                  e.stopPropagation();
                                  handleRemoveStep(step.id);
                                }}
                                className="p-1 hover:bg-red-100 rounded-full transition-colors"
                              >
                                <Trash2 size={14} className="text-red-600" />
                              </button>
                            )}
                          </div>
                          
                          <div className="text-sm">
                            <div className="font-medium text-gray-800 truncate mb-1">
                              {step.subject || "No subject"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {step.body ? `${step.body.length} characters` : "No content"}
                            </div>
                          </div>

                          {/* Progress indicator */}
                          <div className="mt-2">
                            <div className={`w-full h-1 rounded-full ${
                              step.subject && step.body ? 'bg-green-200' : 'bg-gray-200'
                            }`}>
                              <div className={`h-1 rounded-full transition-all ${
                                step.subject && step.body ? 'bg-green-500 w-full' : 'bg-yellow-500 w-1/2'
                              }`}></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step Editor - Enhanced */}
                  {editingStep && (
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                        <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {steps.indexOf(editingStep) + 1}
                          </div>
                          Step {steps.indexOf(editingStep) + 1} Editor
                        </h4>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                              <Clock size={16} />
                              Delay (days after previous step)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editingStep.delay}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleUpdateStep(editingStep.id, "delay", parseInt(e.target.value) || 0)
                              }
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Subject Line *
                            </label>
                            <input
                              value={editingStep.subject}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleUpdateStep(editingStep.id, "subject", e.target.value)
                              }
                              placeholder="Use {{variables}} for personalization"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Email Body *
                            </label>
                            <textarea
                              value={editingStep.body}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                handleUpdateStep(editingStep.id, "body", e.target.value)
                              }
                              placeholder="Available: {{contact_name}}, {{company_name}}, {{industry}}"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none h-32"
                            />
                            <div className="mt-1 text-xs text-gray-500">
                              {editingStep.body.length} characters
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Templates - Enhanced */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                        <h4 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                          <Zap size={20} />
                          Quick Templates
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {EMAIL_TEMPLATES.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => handleApplyTemplate(template.id)}
                              className={`text-left p-4 rounded-lg border-2 transition-all ${
                                selectedTemplate === template.id
                                  ? "border-green-300 bg-green-100 shadow-md"
                                  : "border-gray-200 bg-white hover:border-green-200 hover:shadow-sm"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                  {template.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 mb-1">{template.name}</p>
                                  <p className="text-sm text-gray-600 truncate">{template.subject}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Variables Helper */}
                      <div className="bg-gray-50 rounded-lg p-4 border">
                        <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Building size={16} />
                          Available Variables
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                          {['{{contact_name}}', '{{company_name}}', '{{industry}}', '{{from_name}}', '{{from_email}}'].map((variable) => (
                            <div key={variable} className="bg-white px-2 py-1 rounded border font-mono text-purple-600">
                              {variable}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Summary - Enhanced */}
            <div className="mt-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 size={20} />
                Sequence Analytics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{steps.length}</div>
                  <div className="text-sm text-gray-600">Total Steps</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-purple-600 mb-1">{totalDuration}</div>
                  <div className="text-sm text-gray-600">Days Duration</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className={`text-2xl font-bold mb-1 ${completionRate === 100 ? "text-green-600" : "text-yellow-600"}`}>
                    {completionRate}%
                  </div>
                  <div className="text-sm text-gray-600">Completion</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-indigo-600 mb-1">
                    {steps.filter(s => s.subject && s.body).length}
                  </div>
                  <div className="text-sm text-gray-600">Ready Steps</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Modern Design */}
          <div className="p-6 border-t bg-gradient-to-r from-gray-50 to-gray-100 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                saveSequenceMutation.isPending ? 'bg-purple-500' : 
                completionRate === 100 ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm font-medium text-gray-700">
                {saveSequenceMutation.isPending 
                  ? "💾 Saving sequence..." 
                  : completionRate === 100 
                  ? "✅ Sequence ready to save"
                  : `⏳ ${completionRate}% complete - ${steps.filter(s => !s.subject || !s.body).length} steps need content`
                }
              </span>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => onOpenChange(false)}
                disabled={saveSequenceMutation.isPending}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => saveSequenceMutation.mutate()}
                disabled={!isValid || saveSequenceMutation.isPending}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
              >
                {saveSequenceMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Save Sequence
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TEST EMAIL MODAL */}
      {showTestEmailModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Send size={20} className="text-green-600" />
                Send Email Now
              </h3>
              <button
                onClick={() => setShowTestEmailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {editingStep && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <div className="text-xs text-gray-600">Subject:</div>
                    <div className="font-medium">{editingStep.subject}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Body Preview:</div>
                    <div className="text-sm text-gray-800 max-h-20 overflow-y-auto">
                      {editingStep.body}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowTestEmailModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendTestEmail}
                  disabled={!testEmail || !editingStep?.subject || !editingStep?.body || sendTestEmailMutation.isPending}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {sendTestEmailMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}