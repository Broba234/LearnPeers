import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { WizardSubjectSelector } from "../WizardSubjectSelector";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  ChevronRight,
  Upload,
  Users,
  Zap,
  Globe,
  ChevronLeft,
  Phone,
  PrinterCheck,
  ArrowRight,
  Book,
} from "lucide-react";
import { cn } from "@/lib/utils";
import WizardTimeSlot from "../ui/components/WizardTimeSlot";
import SelectSubject from "../ui/components/SelectSubject";
import EducationStep from "@/components/onboarding/EducationStep";
import { GraduationCap } from "lucide-react";
export type Subjects = {
  id: string;
  name: string;
  code: string;
  grade: number;
  category?: string;
};
type CategoryGroup = {
  name: string;
  subjects: Subjects[];
};
const SignUpWizard = () => {
  const [formData, setFormData] = useState({
    bio: "",
    name: "",
    email: "",
    phone: "",
    grade: "",
    is_tutor: false,
    subjects: [],
  });
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Subjects[]>([]);
  const [selectedSubjectsWithPrice, setSelectedSubjectsWithPrice] = useState<
    Subjects[]
  >([]);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user },
          error: sessionError,
        } = await supabase.auth.getUser();
        if (sessionError || !user) {
          router.push("/auth/login");
          return;
        }
        const profileRes = await fetch(
          `/api/profiles/get-full?email=${encodeURIComponent(user.email!)}`
        );

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
          setFormData({
            bio: profileData.bio || "",
            name: profileData.name || "",
            email: profileData.email || "",
            phone: profileData.phone || "",
            grade: profileData.grade || "",
            is_tutor: profileData.is_tutor || false,
            subjects: profileData.subjects || [],
          });
          let normalizedSubjects: any[] = [];
          if (profileData.subjects && Array.isArray(profileData.subjects)) {
            normalizedSubjects = profileData.subjects
              .map((s: any) => {
                // Check if s.subject exists and is an object
                if (s && s.Subjects && typeof s.Subjects === "object") {
                  return s.Subjects;
                }
                return undefined;
              })
              .filter(
                (Subjects: any): Subjects is any => Subjects !== undefined
              );
          }
          setSelectedSubjects(normalizedSubjects);
        }
      } catch (error) { }
    };

    fetchProfile();

    fetch("/api/subjects")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const catMap = new Map<string, Subjects[]>();
          data.forEach((subject: Subjects) => {
            const cat = subject.category || "Uncategorized";
            if (!catMap.has(cat)) catMap.set(cat, []);
            catMap.get(cat)!.push(subject);
          });
          const grouped: CategoryGroup[] = Array.from(catMap.entries()).map(
            ([name, subjects]) => ({ name, subjects })
          );
          setCategories(grouped);
        } else {
          setSelectedSubjects([]);
          setCategories([]);
        }
      })
      .catch((err) => {
        setSelectedSubjects([]);
        setCategories([]);
      });
  }, [router]);
  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === "is_tutor") {
      processedValue = (value == 1) === true || value === 1;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));
  };
  const [activeStep, setActiveStep] = useState(1);
  const [educationComplete, setEducationComplete] = useState(false);

  const steps = [
    {
      number: 1,
      title: "Your School",
      des: "Tell us where you study so we can match you with the right tutors",
      bigdes:
        "Tell us where you study so we can match you with the right tutors",
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      number: 2,
      title: "Select Subjects",
      des: "Select the subjects you want to learn",
      bigdes:
        " Select the subjects you want to learn",
      icon: <Users className="w-4 h-4" />,
    },
    {
      number: 3,
      title: "Finalize your setup",
      des: "You're all set — jump in and find your first tutor",
      bigdes:
        "You're all set — jump in and find your first tutor",
      icon: <Book className="w-4 h-4" />,
    },
  ];
  const calculateProgress = () => {
    return Math.round(((activeStep - 1) / (steps.length - 1)) * 100);
  };

  const HandleChangeSetUpStatus = async () => {
    try {
      const response = await fetch("/api/profiles/complete-setup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profile.email,
        }),
      });
      if (response.ok) {
        router.push("/home/student/explore");
      } else {
      }
    } catch (e) { }
  };
  // Returns true if ALL subjects have valid price and duration
  let is_all_selected = selectedSubjectsWithPrice.every(
    (s: any, index) =>
      s.duration && s.duration !== "0.0" && s.price && s.price !== 0
  );
  const HandleNextButton = async () => {
    if (activeStep === 1) {
      if (!educationComplete) return;
      setActiveStep(2);
    }
    if (activeStep === 2) {
      if (!profile?.email) return;
      if (selectedSubjects.length === 0) return;
      setLoading(true);
      try {
        const res = await fetch("/api/profiles/update-subjects", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: profile.email,
            subjects: selectedSubjects,
          }),
        });
        setLoading(false);
        if (!res.ok) return;
        setActiveStep(activeStep + 1);
      } catch (e) {
        setLoading(false);
      }
    }
    if (activeStep === 3) {
      HandleChangeSetUpStatus();
    }
  };

  const onSubjectsChange = (subjects: any) => {
    setSelectedSubjects(subjects);
  };
  return (
    <div className=" bg-gradient-to-br w-full from-gray-50 to-gray-100 p-4 md:p-5 rounded-3xl lg:min-h-[736px]">
      <div className="max-w-6xl p-5 bg-[#F3F5F7] border border-gray-200 rounded-3xl mx-auto">
        <div className="max-w-6xl bg-[#ffffff] rounded-3xl mx-auto">
          <div className="flex flex-col items-stretch lg:flex-row rounded-3xl overflow-hidden">
            {/* Left Column - Steps */}
            <div className="lg:w-1/3 lg:flex lg:flex-col relative overflow-hidden">
              <div className="bg-[#F9F9F9] h-full p-6 relative">
                {/* Animated Gradient Overlay */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div
                    className={`absolute w-full h-full bg-gradient-to-tr from-brand-50/30 via-transparent to-transparent transition-all duration-700 ease-out ${activeStep != 1
                        ? "opacity-100 translate-x-0 translate-y-0"
                        : "opacity-0 translate-x-full -translate-y-full"
                      }`}
                  />
                </div>

                <div className="space-y-2 mb-8 relative z-20">
                  {steps.map((step) => (
                    <div
                      key={step.number}
                      // onClick={() => setActiveStep(step.number)}
                      className={`flex items-start gap-4 p-4 cursor-pointer rounded-xl transition-all`}
                    >
                      <div
                        className={`relative flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${activeStep === step.number
                            ? " text-white"
                            : step.number < activeStep
                              ? " text-green-600"
                              : "bg-gray-200 text-gray-600"
                          }`}
                      >
                        {/* <div className="absolute w-1 h-5 top-100 left-0 bg-gray-200"></div> */}
                        {step.number < activeStep ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : step.number == activeStep ? (
                          <div className="w-5 h-5 flex items-center justify-center bg-brand-600 rounded-full">
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                          </div>
                        ) : (
                          <span className="font-semibold">{step.icon}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`font-medium text-gray-700`}>
                            {step.title}
                            <span className="block text-[10px]">
                              {step.des}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div className="mt-8 pt-8 border-t border-gray-200 relative z-20">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        Your Progress
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Complete all steps to launch workspace
                      </p>
                    </div>
                    <div className="flex items-center">
                      <div className="text-2xl font-bold text-brand-600">
                        {calculateProgress()}%
                      </div>
                      <span className="text-sm text-gray-500 ml-1">
                        complete
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    {/* Background track with glass effect */}
                    <div className="h-4 bg-gray-100/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/30 shadow-inner">
                      {/* Progress fill with gradient and animation */}
                      <div
                        className="h-full relative bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 rounded-2xl transition-all duration-1000 ease-out"
                        style={{ width: `${calculateProgress()}%` }}
                      >
                        {/* Moving highlight */}
                        <div
                          className="absolute top-0 left-0 w-20 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"
                          style={{ animationDuration: "2s" }}
                        />
                      </div>
                    </div>

                    {/* Floating progress indicator */}
                    <div
                      className="absolute -top-1 flex flex-col items-center transition-all duration-700 ease-out"
                      style={{
                        left: `calc(${calculateProgress()}% - 12px)`,
                      }}
                    >
                      <div className="w-6 h-6 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center shadow-lg shadow-brand-200">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      {/* <div className="text-xs font-semibold bg-gradient-to-r from-brand-600 to-brand-600 bg-clip-text text-transparent mt-1">
        Step {activeStep}
      </div> */}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Content */}
            <div className="lg:w-2/3 lg:flex lg:flex-col min-h-[500px] md:min-h-[700px]">
              <div className="bg-white h-full p-6 md:p-8 flex flex-col">
                {/* Step Header */}
                <div className="mb-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="inline-flex items-center text-brand-600 text-sm font-medium mb-3">
                        Step {activeStep} of {steps.length}
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-3">
                        {steps[activeStep - 1].title}
                      </h2>
                      <p className="text-gray-600">
                        {steps[activeStep - 1].des}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-auto scrollbar-hide relative">
                  <AnimatePresence mode="wait">

                    {steps[activeStep - 1].number == 1 && (
                      <motion.div
                        key="step-education"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <EducationStep
                          requireVerification={false}
                          allowSkip={true}
                          onComplete={setEducationComplete}
                        />
                      </motion.div>
                    )}
                    {steps[activeStep - 1].number == 2 && (
                      <motion.div
                        key="step-2"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <SelectSubject
                          categories={categories}
                          selectedSubjects={selectedSubjects}
                          onSubjectsChange={onSubjectsChange}
                        />
                      </motion.div>
                    )}
                    {steps[activeStep - 1].number == 3 && (
                      <motion.div
                        key="step-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{
                          duration: 0.4,
                          ease: [0.4, 0, 0.2, 1],
                          delay: 0.1,
                        }}
                        onClick={() => HandleNextButton()}
                        className="w-full h-full flex items-center justify-center"
                      >
                        <motion.button
                          whileHover={{
                            scale: 1.05,
                            boxShadow: "0 20px 40px rgba(0, 119, 190, 0.3)",
                          }}
                          whileTap={{ scale: 0.98 }}
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            duration: 0.5,
                            ease: "backOut",
                            delay: 0.2,
                          }}

                          className="mx-auto group relative flex items-center gap-4 px-6 py-4 rounded-full bg-gradient-to-r from-brand-500 to-brand-500 text-white font-semibold text-lg shadow-lg hover:shadow-2xl transition-all duration-300 focus:outline-none"
                        >
                          {/* Stripe logo container */}
                          <motion.div
                            whileHover={{ rotate: [-5, 5, -5] }}
                            transition={{ duration: 0.5 }}
                            className="bg-white rounded-2xl px-4 py-2 flex items-center justify-center text-brand-600 font-bold text-lg"
                          >

                          </motion.div>
                          Finish
                          {loading ? (
                            // Loading spinner
                            <div className="w-5 h-5 relative">
                              <div className="w-5 h-5 border-2 border-white/30 rounded-full"></div>
                              <div className="w-5 h-5 border-2 border-t-white border-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                            </div>
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-between mt-5">
                  {activeStep > 1 ? (
                   <button
                   onClick={() =>
                     setActiveStep(activeStep > 1 ? activeStep - 1 : 1)
                   }
                   className="hidden md:flex items-center gap-2"
                 >
                   <ChevronLeft className="w-5 h-5" />
                   back
                 </button>
                  ): (
                    <div></div>
                  )}
                  
                  {
                    activeStep < 3 && (
                      <button
                        type="button"
                        disabled={loading || (activeStep == 1 && !educationComplete) || (activeStep == 2 && selectedSubjects.length === 0)}
                        onClick={() => HandleNextButton()}
                        className={`
    hidden md:flex items-center gap-2 px-6 py-3
    text-white rounded-full font-medium
    transition-all duration-300 ease-in-out
    ${loading || (activeStep == 1 && !educationComplete) || (activeStep == 2 && selectedSubjects.length === 0)
                            ? "bg-brand-600/60 cursor-not-allowed"
                            : "bg-brand-600 hover:bg-brand-700 cursor-pointer"
                          }
  `}
                      >
                        Continue
                        {loading ? (
                          // Loading spinner
                          <div className="w-5 h-5 relative">
                            <div className="w-5 h-5 border-2 border-white/30 rounded-full"></div>
                            <div className="w-5 h-5 border-2 border-t-white border-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                          </div>
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    )
                  }
                </div>

                {/* Mobile Continue Button */}
                <div className="mt-10 pt-8 border-t border-gray-200 md:hidden">
                  <button
                    type="button"
                    onClick={() => HandleNextButton()}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpWizard;
