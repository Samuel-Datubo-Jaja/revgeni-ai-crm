"use client";

type Props = { status:
  "NEW" | "QUALIFIED" | "CONTACTED" | "MEETING" | "PROPOSAL" | "WON" | "LOST"
};

const map: Record<Props["status"], string> = {
  NEW:        "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200",
  QUALIFIED:  "bg-sky-100 text-sky-800 ring-1 ring-sky-200",
  CONTACTED:  "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  MEETING:    "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200",
  PROPOSAL:   "bg-violet-100 text-violet-800 ring-1 ring-violet-200",
  WON:        "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
  LOST:       "bg-rose-100 text-rose-800 ring-1 ring-rose-200",
};

export default function StatusPill({ status }: Props) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${map[status]}`}>
      {status}
    </span>
  );
}
