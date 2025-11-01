export default function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/40 py-10 text-center">
      <div className="mx-auto mb-2 h-10 w-10 rounded-full border border-neutral-200 bg-white shadow-sm" />
      <p className="text-sm text-neutral-500">No companies in {label}</p>
    </div>
  );
}
