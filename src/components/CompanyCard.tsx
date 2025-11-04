"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "graphql-request";
import CompanyDetailModal from "./CompanyDetailModal";
import StatusPill from "./StatusPill";
import ScorePill from "./ScorePill";
import {
  SelectRoot,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { ReactNode } from "react";

const ALL = [
  "NEW",
  "QUALIFIED",
  "CONTACTED",
  "MEETING",
  "PROPOSAL",
  "WON",
  "LOST",
] as const;

type CompanyStatus = typeof ALL[number];

type Company = {
  id: string;
  name: string;
  domain?: string | null;
  status: CompanyStatus;
  industry?: string | null;
  score?: number | null;
};

type CompanyCardProps = {
  company: Company;
  children?: ReactNode;
};

const UPDATE_COMPANY_STATUS = `
  mutation UpdateCompanyStatus($id: ID!, $status: String!) {
    updateCompanyStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

export default function CompanyCard({ company, children }: CompanyCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const qc = useQueryClient();

  const move = useMutation({
    mutationFn: (status: string) =>
      request("/api/graphql", UPDATE_COMPANY_STATUS, {
        id: company.id,
        status,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  return (
    <>
      <article
        className={[
          "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm cursor-pointer",
          "transition will-change-transform hover:-translate-y-0.5 hover:shadow-md",
        ].join(" ")}
        onClick={() => setShowDetails(true)}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              {company.name}
            </h3>
            <p className="text-xs text-neutral-500">{company.domain}</p>
          </div>
          <StatusPill status={company.status} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-neutral-600">{company.industry ?? "—"}</p>
          <ScorePill score={company.score ?? 0} />
        </div>

        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          <label className="mb-1 block text-xs text-neutral-500">Current State</label>
          <SelectRoot
            defaultValue={company.status}
            onValueChange={(v) => move.mutate(v)}
          >
            <SelectTrigger />
            <SelectContent>
              {ALL.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectRoot>
        </div>
        {children}
      </article>

      {showDetails && (
        <CompanyDetailModal
          companyId={company.id}
          onClose={() => setShowDetails(false)}
        />
      )}
    </>
  );
}
