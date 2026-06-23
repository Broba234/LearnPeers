import {
  BookOpen,
  Calculator,
  Microscope,
  MessageCircle,
  Briefcase,
  Heart,
  Palette,
  Users,
} from "lucide-react";

// Icon mapping for different categories
export const CATEGORY_ICONS: Record<string, any> = {
  "Business": Briefcase,
  "English": BookOpen,
  "French": MessageCircle,
  "Health and Phys Ed": Heart,
  "Mathematics": Calculator,
  "Science": Microscope,
  "Social Sciences": Users,
  "The Arts": Palette,
};

// Color mapping for different categories
export const CATEGORY_COLORS: Record<string, string> = {
  "Business": "from-brand-500 to-brand-500",
  "English": "from-brand-500 to-brand-500",
  "French": "from-rose-500 to-brand-500",
  "Health and Phys Ed": "from-emerald-500 to-teal-500",
  "Mathematics": "from-brand-500 to-brand-500",
  "Science": "from-brand-500 to-brand-500",
  "Social Sciences": "from-yellow-500 to-orange-500",
  "The Arts": "from-brand-500 to-brand-500",
};

// Default categories data in case none is provided
export const DEFAULT_CATEGORIES = [
  {
    name: "Business",
    subjects: [
      { id: "1", name: "Accounting", code: "ACC", grade: 10 },
      { id: "2", name: "Business Studies", code: "BUS", grade: 10 },
      { id: "3", name: "Entrepreneurship", code: "ENT", grade: 11 },
      { id: "4", name: "Finance", code: "FIN", grade: 12 },
      { id: "5", name: "Marketing", code: "MKT", grade: 11 },
      { id: "6", name: "Management", code: "MGT", grade: 12 }
    ]
  },
  {
    name: "English",
    subjects: [
      { id: "7", name: "Literature", code: "LIT", grade: 9 },
      { id: "8", name: "Writing", code: "WRT", grade: 9 },
      { id: "9", name: "Grammar", code: "GRAM", grade: 9 },
      { id: "10", name: "Comprehension", code: "COMP", grade: 10 },
      { id: "11", name: "Creative Writing", code: "CRW", grade: 11 }
    ]
  },
  {
    name: "Health and Phys Ed",
    subjects: [
      { id: "12", name: "Physical Education", code: "PE", grade: 9 },
      { id: "13", name: "Health Science", code: "HSC", grade: 10 },
      { id: "14", name: "Nutrition", code: "NUT", grade: 11 },
      { id: "15", name: "Anatomy", code: "ANA", grade: 12 },
      { id: "16", name: "First Aid", code: "FAID", grade: 10 },
      { id: "17", name: "Sports Science", code: "SPSC", grade: 12 }
    ]
  },
  {
    name: "Mathematics",
    subjects: [
      { id: "18", name: "Algebra", code: "ALG", grade: 9 },
      { id: "19", name: "Geometry", code: "GEO", grade: 10 },
      { id: "20", name: "Calculus", code: "CALC", grade: 12 },
      { id: "21", name: "Statistics", code: "STAT", grade: 11 },
      { id: "22", name: "Trigonometry", code: "TRIG", grade: 11 }
    ]
  },
  {
    name: "Science",
    subjects: [
      { id: "23", name: "Physics", code: "PHY", grade: 11 },
      { id: "24", name: "Chemistry", code: "CHEM", grade: 11 },
      { id: "25", name: "Biology", code: "BIO", grade: 10 },
      { id: "26", name: "Earth Science", code: "EARTH", grade: 9 },
      { id: "27", name: "Environmental Science", code: "ENV", grade: 11 },
      { id: "28", name: "Astronomy", code: "ASTRO", grade: 12 },
      { id: "29", name: "Computer Science", code: "CS", grade: 10 },
      { id: "30", name: "Engineering", code: "ENG", grade: 12 }
    ]
  },
  {
    name: "Social Sciences",
    subjects: [
      { id: "31", name: "History", code: "HIST", grade: 10 },
      { id: "32", name: "Geography", code: "GEOG", grade: 9 },
      { id: "33", name: "Economics", code: "ECON", grade: 12 },
      { id: "34", name: "Political Science", code: "POLI", grade: 11 },
      { id: "35", name: "Psychology", code: "PSYC", grade: 12 },
      { id: "36", name: "Sociology", code: "SOC", grade: 11 }
    ]
  },
  {
    name: "The Arts",
    subjects: [
      { id: "37", name: "Visual Arts", code: "ART", grade: 9 },
      { id: "38", name: "Music", code: "MUS", grade: 10 },
      { id: "39", name: "Drama", code: "DRAMA", grade: 11 },
      { id: "40", name: "Dance", code: "DANCE", grade: 10 },
      { id: "41", name: "Art History", code: "AHIST", grade: 12 },
      { id: "42", name: "Photography", code: "PHOTO", grade: 11 }
    ]
  }
];
