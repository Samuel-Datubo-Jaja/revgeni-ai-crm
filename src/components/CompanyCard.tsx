"use client";

import StatusPill from "./StatusPill";
import ScorePill from "./ScorePill";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "graphql-request";
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

export default function CompanyCard({ company, children }: CompanyCardProps) {
  const qc = useQueryClient();

  const move = useMutation({
    mutationFn: async (status: string) => {
      const m = `
        mutation($id: ID!, $status: CompanyStatus!) {
          updateCompanyStatus(id: $id, status: $status) { id status }
        }`;
      return request("/api/graphql", m, { id: company.id, status });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });

  return (
    <article
      className={[
        "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm",
        "transition will-change-transform hover:-translate-y-0.5 hover:shadow-md",
      ].join(" ")}
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

      <div className="mt-3">
        <label className="mb-1 block text-xs text-neutral-500">Move to</label>
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
  );
}
