"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "graphql-request";
import { getGqlClient } from "@/lib/gql";
import { Loader2, Plus, Trash2, X } from "lucide-react";

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

  const handleUpdateStep = (id: string, field: string, value: any) => {
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

  const editingStep = steps.find((s) => s.id === editingStepId);
  const completionRate = Math.round(
    (steps.filter((s) => s.subject && s.body).length / steps.length) * 100
  );

  const totalDuration = steps.reduce((sum, s) => sum + s.delay, 0);
  const isValid =
    sequenceName && fromEmail && steps.every((s) => s.subject && s.body);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">✉️ Email Sequence Builder</h2>
            <p className="text-sm text-gray-600 mt-1">
              Create automated email sequences to nurture leads
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            disabled={saveSequenceMutation.isPending}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Sequence Details */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-sm font-semibold text-gray-900">Sequence Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="seq-name" className="block text-sm font-medium mb-2">
                  Sequence Name
                </label>
                <input
                  id="seq-name"
                  placeholder="e.g., Cold Outreach - Enterprise"
                  value={sequenceName}
                  onChange={(e) => setSequenceName(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="from-email" className="block text-sm font-medium mb-2">
                  From Email
                </label>
                <input
                  id="from-email"
                  type="email"
                  placeholder="sales@company.com"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="from-name" className="block text-sm font-medium mb-2">
                  From Name
                </label>
                <input
                  id="from-name"
                  placeholder="Your Name"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Email Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Email Steps</h3>
              <button
                onClick={handleAddStep}
                className="flex items-center gap-2 px-3 py-1 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Step
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Step List */}
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => setEditingStepId(step.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      editingStepId === step.id
                        ? "bg-blue-50 border-blue-300 shadow-sm"
                        : "hover:bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-600">Step {index + 1}</p>
                        <p className="text-sm font-medium truncate">{step.subject || "(No subject)"}</p>
                        {step.delay > 0 && (
                          <p className="text-xs text-gray-500 mt-1">+{step.delay} days</p>
                        )}
                      </div>
                      {steps.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveStep(step.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Step Editor */}
              {editingStep && (
                <div className="col-span-2 space-y-4 border-l pl-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Delay (days after previous)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingStep.delay}
                      onChange={(e) =>
                        handleUpdateStep(editingStep.id, "delay", parseInt(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Subject</label>
                    <input
                      value={editingStep.subject}
                      onChange={(e) =>
                        handleUpdateStep(editingStep.id, "subject", e.target.value)
                      }
                      placeholder="Use {{variables}} for personalization"
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Body</label>
                    <textarea
                      value={editingStep.body}
                      onChange={(e) =>
                        handleUpdateStep(editingStep.id, "body", e.target.value)
                      }
                      placeholder="Available: {{contact_name}}, {{company_name}}, {{industry}}"
                      className="w-full rounded-lg border px-3 py-2 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {/* Templates */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Quick Templates
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {EMAIL_TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleApplyTemplate(template.id)}
                          className={`text-left p-2 rounded border text-xs transition-colors ${
                            selectedTemplate === template.id
                              ? "bg-blue-50 border-blue-300"
                              : "hover:bg-gray-50 border-gray-200"
                          }`}
                        >
                          <p className="font-semibold text-gray-900">{template.name}</p>
                          <p className="text-gray-600 truncate">{template.subject}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-sm font-semibold mb-3">Sequence Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Steps</p>
                <p className="text-lg font-semibold">{steps.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Duration</p>
                <p className="text-lg font-semibold">{totalDuration} days</p>
              </div>
              <div>
                <p className="text-gray-600">Completion</p>
                <p className={`text-lg font-semibold ${completionRate === 100 ? "text-green-600" : "text-yellow-600"}`}>
                  {completionRate}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50 flex gap-3 justify-end">
          <button
            onClick={() => onOpenChange(false)}
            disabled={saveSequenceMutation.isPending}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => saveSequenceMutation.mutate()}
            disabled={!isValid || saveSequenceMutation.isPending}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saveSequenceMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Sequence"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}