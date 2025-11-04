"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, User, DollarSign, Calendar, Building2, Mail, Phone, Edit2, Save, X as Cancel } from "lucide-react";
import { formatTimeAgo, formatDateCRM } from "@/lib/date-utils";
import AddContactModal from './AddContactModal';
import AddDealModal from './AddDealModal';
import AddActivityModal from './AddActivityModal';

interface CompanyDetailModalProps {
  companyId: string;
  onClose: () => void;
}

interface EditableFieldProps {
  label: string;
  value: string | null | undefined;
  editValue: string | undefined;
  isEditing: boolean;
  onChange: (value: string) => void;
  placeholder: string;
}

interface EditableSelectFieldProps {
  label: string;
  value: string | null | undefined;
  editValue: string | undefined;
  isEditing: boolean;
  onChange: (value: string) => void;
  options: string[];
  colorMap?: Record<string, string>;
}

interface EditableScoreFieldProps {
  label: string;
  value: number | null | undefined;
  editValue: number | undefined;
  isEditing: boolean;
  onChange: (value: number) => void;
}

interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string | null;
  sizeBand: string | null;
  geography: string | null;
  status: string;
  score: number | null;
  createdAt: string;
  updatedAt: string;
  people: Person[];
  deals: Deal[];
  events: Event[];
}

interface Person {
  id: string;
  fullName: string;
  title: string | null;
  email: string | null;
  linkedin: string | null;
  createdAt: string;
}

interface Deal {
  id: string;
  name: string;
  value: number | null;
  stage: string;
  createdAt: string;
  updatedAt: string;
}

interface Event {
  id: string;
  type: string;
  summary: string | null;
  body: string | null;
  at: string;
}

interface EditData {
  status?: string;
  score?: number;
  industry?: string;
  sizeBand?: string;
  geography?: string;
}

interface GraphQLVariables {
  id?: string;
  status?: string;
  [key: string]: unknown;
}

interface GraphQLResponse {
  data?: { company?: Company };
  errors?: Array<{ message: string }>;
}

// Update company mutation
const UPDATE_COMPANY_MUTATION = `
  mutation UpdateCompany($id: ID!, $status: String!) {
    updateCompanyStatus(id: $id, status: $status) {
      id status score updatedAt
    }
  }
`;

const COMPANY_DETAIL_QUERY = `
  query CompanyDetail($id: ID!) {
    company(id: $id) {
      id name domain industry sizeBand geography status score createdAt updatedAt
      people { id fullName title email linkedin createdAt }
      deals { id name value stage createdAt updatedAt }
      events { id type summary body at }
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

export default function CompanyDetailModal({ companyId, onClose }: CompanyDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<EditData>({});
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => graphqlFetch(COMPANY_DETAIL_QUERY, { id: companyId }),
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: (updateData: EditData) => 
      graphqlFetch(UPDATE_COMPANY_MUTATION, { 
        id: companyId, 
        status: updateData.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setIsEditing(false);
      setEditData({});
    },
  });

  const company: Company | undefined = data?.company;

  // Initialize edit data when entering edit mode
  const startEditing = () => {
    if (!company) return;
    
    setEditData({
      status: company.status,
      score: company.score || 0,
      industry: company.industry || '',
      sizeBand: company.sizeBand || '',
      geography: company.geography || '',
    });
    setIsEditing(true);
  };

  const saveChanges = () => {
    updateMutation.mutate(editData);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({});
  };

  if (error) return <ErrorView error={error as Error} onClose={onClose} companyId={companyId} />;
  if (isLoading) return <LoadingView companyId={companyId} />;
  if (!company) return <NotFoundView companyId={companyId} onClose={onClose} />;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {/* Header - Fixed at top */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center">
              <Building2 size={28} className="text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-gray-900">{company.name}</h2>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  ✅ Connected
                </span>
              </div>
              <p className="text-gray-600 flex items-center gap-2">
                <span>🌐 {company.domain}</span>
                <span className="text-gray-400">•</span>
                <span className="text-sm">
                  Updated {formatTimeAgo(company.updatedAt)}
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!isEditing ? (
              <button
                onClick={startEditing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
              >
                <Edit2 size={16} />
                Edit Details
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={saveChanges}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  <Save size={16} />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={cancelEditing}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  <Cancel size={16} />
                  Cancel
                </button>
              </div>
            )}
            
            <button
              onClick={onClose}
              className="p-3 hover:bg-white/70 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* AI Banner - Fixed below header */}
        <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h3 className="text-xl font-bold">AI-Discovered Company Profile</h3>
              <p className="text-blue-100">
                {isEditing 
                  ? 'Edit mode active - Update status and add missing information'
                  : 'Core data discovered by AI. Click Edit Details to update status or add missing information.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - Company Details */}
            <div className="space-y-6">
              <div className={`rounded-xl p-6 border ${isEditing ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Building2 size={20} className={isEditing ? 'text-blue-600' : 'text-gray-600'} />
                  Company Information 
                  {isEditing && <span className="text-sm text-blue-600">(Editing Mode)</span>}
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Industry - User Editable */}
                    <EditableField
                      label="Industry"
                      value={company.industry}
                      editValue={editData.industry}
                      isEditing={isEditing}
                      onChange={(value) => setEditData({...editData, industry: value})}
                      placeholder="e.g. Banking, Technology"
                    />
                    
                    {/* Company Size - User Editable */}
                    <EditableSelectField
                      label="Company Size"
                      value={company.sizeBand}
                      editValue={editData.sizeBand}
                      isEditing={isEditing}
                      onChange={(value) => setEditData({...editData, sizeBand: value})}
                      options={['startup', '1-10', '11-50', '51-200', '201-500', '501-1000', '1001+', 'enterprise']}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Geography - User Editable */}
                    <EditableField
                      label="Location"
                      value={company.geography}
                      editValue={editData.geography}
                      isEditing={isEditing}
                      onChange={(value) => setEditData({...editData, geography: value})}
                      placeholder="e.g. United States, United Kingdom"
                    />
                    
                    {/* Lead Score - User Editable */}
                    <EditableScoreField
                      label="Lead Score"
                      value={company.score}
                      editValue={editData.score}
                      isEditing={isEditing}
                      onChange={(value) => setEditData({...editData, score: value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Status - User Editable */}
                    <EditableSelectField
                      label="Status"
                      value={company.status}
                      editValue={editData.status}
                      isEditing={isEditing}
                      onChange={(value) => setEditData({...editData, status: value})}
                      options={['NEW', 'QUALIFIED', 'CONTACTED', 'MEETING', 'PROPOSAL', 'WON', 'LOST']}
                      colorMap={{
                        'NEW': 'bg-blue-100 text-blue-800',
                        'QUALIFIED': 'bg-green-100 text-green-800',
                        'CONTACTED': 'bg-yellow-100 text-yellow-800',
                        'MEETING': 'bg-purple-100 text-purple-800',
                        'PROPOSAL': 'bg-orange-100 text-orange-800',
                        'WON': 'bg-emerald-100 text-emerald-800',
                        'LOST': 'bg-red-100 text-red-800'
                      }}
                    />
                    
                    {/* Added Date - Fixed with date-utils */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        Added to CRM
                        <span className="text-xs text-gray-400">📅 System</span>
                      </label>
                      <p className="text-lg font-medium text-gray-900 mt-1">
                        {formatDateCRM(company.createdAt)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(company.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold mb-4 text-blue-900">Quick Actions</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { icon: Mail, label: 'Send Email', color: 'blue' },
                    { icon: Phone, label: 'Schedule Call', color: 'green' },
                    { icon: Calendar, label: 'Book Meeting', color: 'purple' },
                    { icon: User, label: 'Add Contact', color: 'orange' }
                  ].map((action, i) => (
                    <button 
                      key={i}
                      className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <action.icon size={20} className="text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-900">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - CRM Data */}
            <div className="space-y-6">
              <ContactsSection company={company} onAddContact={() => setShowAddContact(true)} />
              <DealsSection company={company} onAddDeal={() => setShowAddDeal(true)} />
              <ActivitySection company={company} onAddActivity={() => setShowAddActivity(true)} />
            </div>
          </div>
        </div>

        {/* Footer - Fixed at bottom, always visible */}
        <div className="p-6 border-t bg-gradient-to-r from-gray-50 to-gray-100 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${isEditing ? 'bg-blue-500' : 'bg-green-500'}`}></div>
            <span className="text-sm font-medium">
              {isEditing ? (
                <span className="text-blue-700">🔧 Edit mode active - Save your changes</span>
              ) : (
                <span className="text-green-700">🤖 AI-discovered data • ✅ CRM synchronized</span>
              )}
            </span>
          </div>
          <div className="flex gap-3">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2">
              <Mail size={18} />
              Email Campaign
            </button>
            <button className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium">
              View Full Profile
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddContact && (
        <AddContactModal
          companyId={companyId}
          companyName={company.name}
          onClose={() => setShowAddContact(false)}
        />
      )}

      {showAddDeal && (
        <AddDealModal
          companyId={companyId}
          companyName={company.name}
          onClose={() => setShowAddDeal(false)}
        />
      )}

      {showAddActivity && (
        <AddActivityModal
          companyId={companyId}
          companyName={company.name}
          onClose={() => setShowAddActivity(false)}
        />
      )}
    </div>
  );
}

function ErrorView({ error, onClose, companyId }: { error: Error; onClose: () => void; companyId: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-red-600">Failed to load company</h2>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        <p className="text-gray-700">Company ID: {companyId}</p>
        <p className="mt-2 text-sm text-gray-500">{error.message}</p>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingView({ companyId }: { companyId: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          <div>
            <div className="text-lg font-semibold text-gray-900">Loading company...</div>
            <div className="text-sm text-gray-500">Company ID: {companyId}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotFoundView({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Company not found</h2>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        <p className="text-gray-700">We couldn't find a company with ID: {companyId}</p>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function EditableField({ label, value, editValue, isEditing, onChange, placeholder }: EditableFieldProps) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <label className="text-sm font-medium text-gray-500">
        {label}
      </label>
      {isEditing ? (
        <input
          type="text"
          value={editValue ?? value ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      ) : (
        <div className="mt-1">
          <p className="text-lg font-medium text-gray-900">
            {value || <span className="text-gray-400">Not specified</span>}
          </p>
        </div>
      )}
    </div>
  );
}

function EditableSelectField({ label, value, editValue, isEditing, onChange, options, colorMap }: EditableSelectFieldProps) {
  const currentValue = editValue ?? value;
  const colorClass = colorMap?.[currentValue || ''] || 'bg-gray-100 text-gray-800';
  
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <label className="text-sm font-medium text-gray-500">
        {label}
      </label>
      {isEditing ? (
        <select
          value={currentValue ?? ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select...</option>
          {options.map((option: string) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : (
        <div className="mt-2">
          <span className={`px-4 py-2 rounded-full font-medium ${colorClass}`}>
            {value || 'Not set'}
          </span>
        </div>
      )}
    </div>
  );
}

function EditableScoreField({ label, value, editValue, isEditing, onChange }: EditableScoreFieldProps) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <label className="text-sm font-medium text-gray-500">
        {label}
      </label>
      {isEditing ? (
        <input
          type="number"
          min="0"
          max="100"
          value={editValue ?? value ?? 0}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(parseInt(e.target.value) || 0)}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      ) : (
        <div className="mt-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-green-600">
              {value || 0}
            </span>
            <span className="text-gray-500">/100</span>
          </div>
        </div>
      )}
    </div>
  );
}

// CRM Sections
function ContactsSection({ company, onAddContact }: { company: Company; onAddContact: () => void }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-900">
        <User size={20} />
        Contacts ({company.people?.length || 0})
      </h3>
      {company.people?.length > 0 ? (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {company.people.slice(0, 3).map((person) => (
            <div key={person.id} className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
              <div className="font-semibold text-gray-900">{person.fullName}</div>
              <div className="text-sm text-gray-600 mt-1">{person.title}</div>
              {person.email && (
                <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
                  <Mail size={14} />
                  <a href={`mailto:${person.email}`} className="hover:underline">
                    {person.email}
                  </a>
                </div>
              )}
              <div className="text-xs text-gray-500 mt-2">
                Added {formatTimeAgo(person.createdAt)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-blue-200">
          <User size={48} className="mx-auto mb-3 text-blue-300" />
          <p className="text-gray-600 mb-4">No contacts added yet</p>
          <button 
            onClick={onAddContact}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Add First Contact
          </button>
        </div>
      )}
    </div>
  );
}

function DealsSection({ company, onAddDeal }: { company: Company; onAddDeal: () => void }) {
  return (
    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-900">
        <DollarSign size={20} />
        Deals ({company.deals?.length || 0})
      </h3>
      {company.deals?.length > 0 ? (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {company.deals.slice(0, 3).map((deal) => (
            <div key={deal.id} className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
              <div className="font-semibold text-gray-900">{deal.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                Stage: <span className="font-medium">{deal.stage}</span>
              </div>
              {deal.value && (
                <div className="text-xl text-green-600 font-bold mt-2">
                  ${deal.value.toLocaleString()}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-2">
                Created {formatTimeAgo(deal.createdAt)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-green-200">
          <DollarSign size={48} className="mx-auto mb-3 text-green-300" />
          <p className="text-gray-600 mb-4">No deals created yet</p>
          <button 
            onClick={onAddDeal}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
          >
            Create First Deal
          </button>
        </div>
      )}
    </div>
  );
}

function ActivitySection({ company, onAddActivity }: { company: Company; onAddActivity: () => void }) {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-purple-900">
        <Calendar size={20} />
        Recent Activity ({company.events?.length || 0})
      </h3>
      {company.events?.length > 0 ? (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {company.events.slice(0, 3).map((event) => (
            <div key={event.id} className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
              <div className="font-semibold text-gray-900">{event.type}</div>
              <div className="text-sm text-gray-600 mt-1">
                {event.summary}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {formatTimeAgo(event.at)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-purple-200">
          <Calendar size={48} className="mx-auto mb-3 text-purple-300" />
          <p className="text-gray-600 mb-4">No recent activity</p>
          <button 
            onClick={onAddActivity}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
          >
            Log First Activity
          </button>
        </div>
      )}
    </div>
  );
}