import { BadgeCheck, GraduationCap } from "lucide-react";
import type { Tutor } from "../types";

export const SchoolBadge = ({ tutor }: { tutor: Tutor }) => {
  const verified = tutor.verifiedSchool;
  const label = verified?.abbreviation || verified?.name || tutor.schoolAbbr || tutor.schoolName;
  if (!label) return null;
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
        <BadgeCheck className="h-3 w-3" />
        Verified {label} student
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
      <GraduationCap className="h-3 w-3" />
      {label}
    </span>
  );
};
