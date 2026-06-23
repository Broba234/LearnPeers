export type Subjects = {
  id: string;
  name: string;
  code: string;
  grade: number;
  category?: string;
  duration_1?: number | string | null;
  duration_2?: number | string | null;
  duration_3?: number | string | null;
  price_1?: number | string | null;
  price_2?: number | string | null;
  price_3?: number | string | null;
  // trust layer (present on tutor.subjects from available-tutors)
  verified?: boolean;
  grade_label?: string | null;
  mastery?: number | null;
  sessions_count?: number | null;
  course_rating?: number | null;
  course_rating_count?: number | null;
  tier?: string | null;
};

export type CategoryGroup = {
  name: string;
  subjects: Subjects[];
};

export type AvailableSlot = {
  subject_id?: string | null;
  start_time?: string | Date | null;
  end_time?: string | Date | null;
  start_date?: string | Date | null;
  end_date?: string | Date | null;
};

export type VerifiedSchool = { name: string | null; abbreviation: string | null; kind: string };
export type TopCourse = { code: string | null; name: string | null; grade_label: string | null; mastery: number | null };

export type Tutor = {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  rating?: number | null;
  isAvailableNow?: boolean | null;
  derivedActiveNow?: boolean;
  education?: string | null;
  timezone?: string | null;
  subjects: Subjects[];
  availableSlots?: AvailableSlot[];
  // trust layer (tutor level)
  verifiedSchool?: VerifiedSchool | null;
  schoolName?: string | null;
  schoolAbbr?: string | null;
  totalSessions?: number;
  totalReviews?: number;
  verifiedCount?: number;
  topCourse?: TopCourse | null;
};

export type SortKey = "recommended" | "rating" | "sessions" | "price";

export type StudentSubject = {
  subject_id: string;
  institution_course_id?: string | null;
  name?: string;
  code?: string;
};
