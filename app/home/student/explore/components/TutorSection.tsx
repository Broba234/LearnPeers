import type { Tutor } from "../types";
import { TutorCard } from "./TutorCard";
import { SkeletonCard } from "./SkeletonCard";

export const TutorSection = ({
  title,
  icon,
  tutors,
  loading,
  onBook,
  onConnectNow,
  savedIds,
  onToggleSave,
}: {
  title: string;
  icon?: React.ReactNode;
  tutors: Tutor[];
  loading: boolean;
  onBook: (tutor: Tutor) => void;
  onConnectNow?: (tutor: Tutor) => void;
  savedIds?: Set<string>;
  onToggleSave?: (id: string) => void;
}) => {
  if (!loading && tutors.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2.5 mb-4">
        {icon}
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {!loading && (
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {tutors.length}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)
          : tutors.map((tutor) => (
              <TutorCard
                key={tutor.id}
                tutor={tutor}
                onBook={onBook}
                onConnectNow={onConnectNow}
                saved={savedIds?.has(tutor.id)}
                onToggleSave={onToggleSave}
              />
            ))}
      </div>
    </div>
  );
};
