"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { gql } from "graphql-request";
import { useMemo } from "react";
import { getGqlClient } from "@/lib/gql";
import CompanyCard from "@/components/CompanyCard";
import EmptyState from "@/components/EmptyState";
import { LeadFinderModal } from "@/components/LeadFinderModal";
import { EmailSequenceBuilder } from "@/components/EmailSequenceBuilder";
import { CompanyAssignmentModal } from '@/components/CompanyAssignmentModal';
import { DashboardCharts } from "@/components/DashboardCharts";
import toast, { Toaster } from 'react-hot-toast';

/* GraphQL */
const Q_COMPANIES = gql`
  query Companies {
    companies {
      id
      name
      domain
      industry
      sizeBand
      geography
      status
      score
    }
  }
`;

const M_MOVE = gql`
  mutation Move($id: ID!, $status: String!) {
    updateCompanyStatus(id: $id, status: $status) {
      id
      status
      updatedAt
    }
  }
`;

const M_SEED = gql`
  mutation Seed {
    runLeadWorker {
      id
      name
    }
  }
`;

/* Types */
type Company = {
  id: string;
  name: string;
  domain?: string | null;
  industry?: string | null;
  sizeBand?: string | null;
  geography?: string | null;
  status: "NEW" | "QUALIFIED" | "CONTACTED" | "MEETING" | "PROPOSAL" | "WON" | "LOST";
  score?: number | null;
};

const STAGES: Company["status"][] = [
  "NEW",
  "QUALIFIED",
  "CONTACTED",
  "MEETING",
  "PROPOSAL",
  "WON",
  "LOST",
];

export default function PipelinePage() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [openLeadFinder, setOpenLeadFinder] = useState(false);
  const [openEmailSequence, setOpenEmailSequence] = useState(false);
  const [openCompanyAssignment, setOpenCompanyAssignment] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/sign-in");
    }
  }, [isLoaded, userId, router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      try {
        const client = getGqlClient();
        const res = await client.request<{ companies: Company[] }>(Q_COMPANIES);
        return res.companies;
      } catch (err) {
        console.error("GraphQL Error:", err);
        throw err;
      }
    },
    enabled: !!userId,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data ?? [];
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.domain ?? "").toLowerCase().includes(q) ||
        (c.industry ?? "").toLowerCase().includes(q) ||
        (c.geography ?? "").toLowerCase().includes(q)
    );
  }, [data, search]);

  async function seedDemo() {
    const client = getGqlClient();
    await client.request(M_SEED);
    qc.invalidateQueries({ queryKey: ["companies"] });
  }

  async function moveTo(id: string, status: Company["status"]) {
    // Get company name for better toast message
    const company = data?.find(c => c.id === id);
    const companyName = company?.name || 'Company';
    
    try {
      const client = getGqlClient();
      await client.request(M_MOVE, { id, status });
      qc.invalidateQueries({ queryKey: ["companies"] });
      
      // ✅ Success toast
      toast.success(`${companyName} moved to ${status}`, {
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#10B981',
          color: '#fff',
          fontWeight: '500',
        },
        icon: '✅',
      });
      
    } catch (error) {
      console.error('Error moving company:', error);
      
      // ❌ Error toast
      toast.error(`Failed to move ${companyName}`, {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '500',
        },
        icon: '❌',
      });
    }
  }

  if (!isLoaded || !userId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-8">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">RevGeni-CRM</h1>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            placeholder="Search company, domain, industry..."
            className="rounded-lg border px-3 py-2 text-sm flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          
          <div className="flex gap-2">
            <button
              onClick={() => setOpenLeadFinder(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
            >
              🤖 Find Leads
            </button>
            
            <button
              onClick={() => setOpenEmailSequence(true)}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 transition-colors font-medium whitespace-nowrap"
            >
              ✉️ Email Sequence
            </button>

            <button
              onClick={() => setOpenCompanyAssignment(true)}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 transition-colors font-medium whitespace-nowrap"
            >
              👥 Assign Companies
            </button>

            {/* Only show in development */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={seedDemo}
                className="rounded-lg bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors font-medium whitespace-nowrap"
              >
                📊 Seed Demo
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Dashboard Charts Section */}
      {data && data.length > 0 && (
        <div className="mb-8">
          <DashboardCharts companies={data.map(company => ({
            ...company,
            industry: company.industry ?? null,
            score: company.score ?? null
          }))} />
        </div>
      )}

      {/* Board */}
      {error ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-red-600">
          Failed to load companies.
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((stage) => {
            const items = filtered.filter((c) => c.status === stage);
            return (
              <div key={stage} className="rounded-2xl border bg-white">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">
                    {stage}
                  </div>
                  <div className="bg-neutral-100 rounded-full px-2 py-1 text-xs font-semibold text-neutral-700">
                    {items.length}
                  </div>
                </div>

                <div className="space-y-3 p-3">
                  {isLoading ? (
                    <EmptyState label={`Loading ${stage.toLowerCase()}...`} />
                  ) : items.length === 0 ? (
                    <EmptyState label={`No companies in ${stage}`} />
                  ) : (
                    items.map((c) => (
                      <div key={c.id}>
                        <CompanyCard company={c}>
                          <div className="mt-3">
                            <label className="mb-1 block text-xs text-neutral-500 font-semibold">
                              Move to:
                            </label>
                            <select
                              className="w-full rounded-lg border bg-white px-2 py-1 text-sm hover:border-blue-300 focus:border-blue-500 focus:outline-none"
                              value={c.status}
                              onClick={(e: React.MouseEvent<HTMLSelectElement>) => e.stopPropagation()}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                e.stopPropagation();
                                moveTo(c.id, e.target.value as Company["status"]);
                              }}
                            >
                              {STAGES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </CompanyCard>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Modals */}
      <LeadFinderModal open={openLeadFinder} onOpenChange={setOpenLeadFinder} />
      <EmailSequenceBuilder
        open={openEmailSequence}
        onOpenChange={setOpenEmailSequence}
      />
      <CompanyAssignmentModal
        open={openCompanyAssignment}
        onClose={() => setOpenCompanyAssignment(false)}
      />

      {/* Toaster Component */}
      <Toaster 
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Default options for all toasts
          className: '',
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          // Success toast styling
          success: {
            duration: 3000,
            style: {
              background: '#10B981',
              color: '#fff',
            },
          },
          // Error toast styling
          error: {
            duration: 4000,
            style: {
              background: '#EF4444',
              color: '#fff',
            },
          },
        }}
      />
    </main>
  );
}