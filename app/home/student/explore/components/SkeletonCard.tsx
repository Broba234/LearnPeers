export const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
    <div className="flex items-start gap-4">
      <div className="w-14 h-14 rounded-full bg-slate-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="h-4 bg-slate-200 rounded w-32" />
          <div className="h-4 bg-slate-200 rounded w-12" />
        </div>
        <div className="h-3 bg-slate-200 rounded w-48" />
        <div className="h-3 bg-slate-200 rounded w-36" />
      </div>
    </div>
    <div className="flex gap-1.5 mt-3">
      <div className="h-5 bg-slate-200 rounded-full w-16" />
      <div className="h-5 bg-slate-200 rounded-full w-20" />
      <div className="h-5 bg-slate-200 rounded-full w-14" />
    </div>
    <div className="h-10 bg-slate-200 rounded-xl mt-4 w-full" />
  </div>
);
