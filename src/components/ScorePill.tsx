"use client";

export default function ScorePill({ score }: { score?: number | null }) {
  if (score == null) return null;
  const tone = score >= 75 ? "bg-emerald-100 text-emerald-800 ring-emerald-200" :
              score >= 60 ? "bg-amber-100 text-amber-800 ring-amber-200" :
                            "bg-neutral-100 text-neutral-700 ring-neutral-200";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tone}`}>
      Score {score}
    </span>
  );
}
