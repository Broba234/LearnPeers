import type { Tutor } from "../types";

export const AvailableNowRail = ({
  tutors,
  onConnect,
}: {
  tutors: Tutor[];
  onConnect: (tutor: Tutor) => void;
}) => {
  if (tutors.length === 0) return null;
  return (
    <div className="mb-8">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
        Available Now
      </p>
      <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {tutors.map((tutor) => (
          <button
            key={tutor.id}
            onClick={() => onConnect(tutor)}
            className="flex flex-col items-center gap-2 flex-shrink-0 group"
          >
            <div className="relative">
              <img
                src={tutor.avatar || "/default-avatar.png"}
                alt={tutor.name}
                className="w-14 h-14 rounded-full object-cover bg-slate-100 ring-2 ring-green-400 ring-offset-2"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <span className="text-xs font-medium text-slate-700 max-w-[56px] truncate text-center group-hover:text-brand-600 transition-colors">
              {tutor.name.split(" ")[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
