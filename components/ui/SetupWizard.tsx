import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
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
import { getCountryFromTimezone } from "@/lib/timezone-to-country";
import SelectSubject from "./components/SelectSubject";
import WizardTimeSlot from "./components/WizardTimeSlot";
import EducationStep from "@/components/onboarding/EducationStep";
import { GraduationCap } from "lucide-react";
const ArrowLeftIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 19l-7-7m0 0l7-7m-7 7h18"
    />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14 5l7 7m0 0l-7 7m7-7H3"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);
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
const SetupWizard = () => {
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
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [educationComplete, setEducationComplete] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Land on the Stripe step when returning from Stripe onboarding or manual back
  useEffect(() => {
    const step = searchParams.get("setup");
    const stored = typeof window !== "undefined" && sessionStorage.getItem("setupReturnStep");
    if (step === "4" || step === "5" || stored === "4" || stored === "5") {
      setActiveStep(5);
      setEducationComplete(true);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("setupReturnStep");
      }
      if (step === "4" || step === "5") {
        router.replace("/home/tutor", { scroll: false });
      }
    }
  }, [searchParams, router]);

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
          console.log("profileData", profileData);
          setStripeConnected(Boolean(profileData.stripe_account_id));
        }
      } catch (error) {}
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

  useEffect(() => {
    if (activeStep === 5 && profile?.email) {
      fetch(
        `/api/stripe/connect/status?email=${encodeURIComponent(profile.email)}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.connected) setStripeConnected(true);
        })
        .catch(() => {});
    }
  }, [activeStep, profile?.email]);
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

  const steps = [
    {
      number: 1,
      title: "Your School",
      des: "Tell us where you study — university tutors verify with their school email",
      bigdes:
        "Tell us where you study. University tutors verify with their school email so students know who they're learning from.",
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      number: 2,
      title: "Personal Information",
      des: "We need some information about you to set up your workspace",
      bigdes:
        " Tell us a bit about yourself—what makes your teaching style unique? We'll share this with students looking for the perfect match.",
      icon: <Users className="w-4 h-4" />,
    },
    {
      number: 3,
      title: "Select Subjects",
      des: "Select the subjects you are proficient in! it will help our students to find you",
      bigdes:
        " Select the subjects you are proficient in! it will help our students to find you",
      icon: <Users className="w-4 h-4" />,
    },
    {
      number: 4,
      title: "Subjects & Pricing",
      des: "Set your session pricing and durations to help students find you!",
      bigdes:
        "Set your session pricing and durations to help students find you!",
      icon: <Book className="w-4 h-4" />,
    },
    {
      number: 5,
      title: "Stripe Integrations",
      des: "Connect your Stripe account to start accepting payments! you will be able to accept payments for your services",
      bigdes:
        " Connect your Stripe account to start accepting payments! you will be able to accept payments for your services",
      icon: <Zap className="w-4 h-4" />,
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
        router.push("/home/tutor/availability");
      } else {
        toast.error("Couldn't finish setup — try again");
      }
    } catch (e) {
      toast.error("Couldn't finish setup — try again");
    }
  };
  // Returns true if ALL subjects have valid price and duration
  let is_all_selected = selectedSubjectsWithPrice.every(
    (s: any) => s.duration_1 && s.duration_1 !== "0.0" && Number(s.price_1) > 0
    && s.duration_2 && s.duration_2 !== "0.0" && Number(s.price_2) > 0
    && s.duration_3 && s.duration_3 !== "0.0" && Number(s.price_3) > 0
);
  const HandleNextButton = async () => {
    if (activeStep === 1) {
      // EducationStep persists its own data; just gate on completion
      if (!educationComplete) {
        toast.error("Tell us where you study first");
        return;
      }
      setActiveStep(2);
    }
    if (activeStep === 2) {
      if (!profile?.email) return;
      if (!formData.phone) return;
      if (!formData.bio) return;
      setLoading(true);
      try {
        const res = await fetch("/api/profiles/update-bio", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: profile.email,
            name: profile.name,
            phone: formData.phone,
            bio: formData.bio,
            is_tutor: formData.is_tutor,
          }),
        });
        setLoading(false);
        if (!res.ok) {
          toast.error("Couldn't save your info — try again");
          return;
        }
        setActiveStep(activeStep + 1);
      } catch (e) {
        setLoading(false);
        toast.error("Couldn't save your info — try again");
      }
    }
    if (activeStep === 3) {
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
        if (!res.ok) {
          toast.error("Couldn't save your subjects — try again");
          return;
        }
        setActiveStep(activeStep + 1);
      } catch (e) {
        setLoading(false);
        toast.error("Couldn't save your subjects — try again");
      }
    }
    if (activeStep === 4) {
      if (!profile?.email) return;
      if (selectedSubjectsWithPrice.length === 0) return;
      if(!is_all_selected) return;
      setLoading(true);
      try {
        const response = await fetch("/api/subjects/update-subjects-and-prices", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: profile.email,
            subjects: selectedSubjectsWithPrice,
          }),
        });
        setLoading(false);
        if(response.status === 200){
          setActiveStep(activeStep + 1);
        } else {
          toast.error("Couldn't save your pricing — try again");
        }
      } catch (e) {
        setLoading(false);
        toast.error("Couldn't save your pricing — try again");
      }
    }
    if (activeStep === 5) {
      if (formData.is_tutor && !stripeConnected) return;
      HandleChangeSetUpStatus();
    }
  };

  const onSubjectsChange = (subjects: any) => {
    setSelectedSubjects(subjects);
  };
  return (
    <div className=" bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-5 rounded-3xl lg:min-h-[736px]">
      <div className="max-w-6xl p-5 bg-[#F3F5F7] border border-gray-200 rounded-3xl mx-auto">
        <div className="max-w-6xl bg-[#ffffff] rounded-3xl mx-auto">
          <div className="flex flex-col items-stretch lg:flex-row rounded-3xl overflow-hidden">
            {/* Left Column - Steps */}
            <div className="lg:w-1/3 lg:flex lg:flex-col relative overflow-hidden">
              <div className="bg-[#F9F9F9] h-full p-6 relative">
                {/* Animated Gradient Overlay */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div
                    className={`absolute w-full h-full bg-gradient-to-tr from-brand-50/30 via-transparent to-transparent transition-all duration-700 ease-out ${
                      activeStep != 1
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
                        className={`relative flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          activeStep === step.number
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
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <EducationStep
                          requireVerification={true}
                          onComplete={setEducationComplete}
                        />
                      </motion.div>
                    )}
                    {steps[activeStep - 1].number == 2 && (
                      <motion.div
                        key="step-1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="max-w-2xl mx-auto space-y-6"
                      >
                        {/* Bio Input */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                          className="relative group"
                        >
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Are you a student or a full time teacher?
                          </label>

                          <div className="relative">
                            <motion.div className="flex items-center justify-start gap-3">
                              <div className="flex cursor-pointer items-center flex-1 ps-4 rounded-2xl border-2 border-gray-200 bg-neutral-primary-soft rounded-base">
                                <input
                                  checked={formData.is_tutor === false}
                                  id="bordered-radio-1"
                                  type="radio"
                                  value={0}
                                  onChange={(e) => handleInputChange(e)}
                                  name="is_tutor"
                                  className="w-4 h-4 cursor-pointer"
                                />
                                <label
                                  htmlFor="bordered-radio-1"
                                  className="w-full cursor-pointer py-4 select-none ms-2 text-sm font-medium text-heading"
                                >
                                  Student
                                </label>
                              </div>
                              <div className="flex cursor-pointer items-center rounded-2xl border-2 border-gray-200 flex-1 ps-4 border-default bg-neutral-primary-soft rounded-base">
                                <input
                                  checked={formData.is_tutor === true}
                                  id="bordered-radio-2"
                                  type="radio"
                                  value={1}
                                  onChange={(e) => handleInputChange(e)}
                                  name="is_tutor"
                                  className="w-4 h-4 cursor-pointer"
                                />
                                <label
                                  htmlFor="bordered-radio-2"
                                  className="w-full  cursor-pointer py-4 select-none ms-2 text-sm font-medium text-heading"
                                >
                                  Teacher
                                </label>
                              </div>
                            </motion.div>
                          </div>
                        </motion.div>
                        {/* Bio Input */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                          className="relative group"
                        >
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bio
                          </label>

                          <div className="relative">
                            <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />

                            <motion.div
                              whileHover={{ scale: 1.005 }}
                              transition={{ duration: 0.2 }}
                              className="relative bg-white rounded-2xl border-2 border-gray-200 p-[2px] transition-all duration-300 hover:border-brand-300 group-focus-within:border-brand-400 group-focus-within:shadow-lg group-focus-within:shadow-brand-100"
                            >
                              <div className="flex items-center">
                                <div className="flex-1 px-4">
                                  <input
                                    type="text"
                                    name="bio"
                                    value={formData.bio}
                                    onChange={(e) => handleInputChange(e)}
                                    placeholder="Enter your bio"
                                    className="w-full py-3 px-0 border-0 focus:ring-0 focus:outline-none text-lg placeholder:text-gray-400 bg-transparent"
                                  />
                                </div>
                              </div>
                            </motion.div>

                            <div className="absolute -bottom-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent opacity-50" />
                          </div>
                        </motion.div>

                        {/* Phone Input */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.15 }}
                          className="relative group"
                        >
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone
                          </label>

                          <div className="relative">
                            <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />

                            <motion.div
                              whileHover={{ scale: 1.005 }}
                              transition={{ duration: 0.2 }}
                              className="relative bg-white rounded-2xl border-2 border-gray-200 p-[2px] transition-all duration-300 hover:border-brand-300 group-focus-within:border-brand-400 group-focus-within:shadow-lg group-focus-within:shadow-brand-100"
                            >
                              <div className="flex items-center">
                                <div className="flex-1 px-4">
                                  <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange(e)}
                                    placeholder="Enter your phone number"
                                    className="w-full py-3 px-0 border-0 focus:ring-0 focus:outline-none text-lg placeholder:text-gray-400 bg-transparent"
                                  />
                                </div>
                              </div>
                            </motion.div>

                            <div className="absolute -bottom-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent opacity-50" />
                          </div>
                        </motion.div>

                        {/* Helper text */}
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3, delay: 0.3 }}
                          className="mt-3 text-sm text-gray-500"
                        >
                          This will be used to personalize your workspace and
                          communications
                        </motion.p>
                      </motion.div>
                    )}

                    {steps[activeStep - 1].number == 3 && (
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
                    {steps[activeStep - 1].number == 4 && (
                      <motion.div
                        key="step-3"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <WizardTimeSlot
                          setSelectedSubjectsWithPrice={
                            setSelectedSubjectsWithPrice
                          }
                        />
                      </motion.div>
                    )}

                    {steps[activeStep - 1].number == 5 && (
                      <motion.div
                        key="step-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{
                          duration: 0.4,
                          ease: [0.4, 0, 0.2, 1],
                          delay: 0.1,
                        }}
                        className="w-full h-full flex flex-col items-center justify-center gap-6"
                      >
                        {stripeConnected ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-green-50 border-2 border-green-200"
                          >
                            <CheckCircle className="w-16 h-16 text-green-600" />
                            <p className="text-lg font-semibold text-green-800">
                              Stripe account connected
                            </p>
                            <p className="text-sm text-green-700 text-center max-w-md">
                              You can now receive payments for your tutoring sessions.
                            </p>
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              disabled={stripeLoading}
                              onClick={async () => {
                                setStripeLoading(true);
                                try {
                                  const res = await fetch(
                                    "/api/stripe/connect/login-link",
                                    { method: "POST" }
                                  );
                                  const data = await res.json();
                                  if (data.url) {
                                    sessionStorage.setItem("setupReturnStep", "5");
                                    window.location.href = data.url;
                                  } else {
                                    setStripeLoading(false);
                                    toast.error(data.error || "Failed to open Stripe dashboard");
                                  }
                                } catch {
                                  setStripeLoading(false);
                                  toast.error("Failed to open Stripe dashboard");
                                }
                              }}
                              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-green-800 bg-white border-2 border-green-300 hover:bg-green-50 hover:border-green-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                              {stripeLoading ? "Opening…" : "Manage Stripe account"}
                            </motion.button>
                          </motion.div>
                        ) : (
                          <>
                            <p className="text-gray-600 text-center max-w-md">
                              {formData.is_tutor
                                ? "Connect your Stripe account to receive payments from students. You'll complete a quick onboarding on Stripe's secure site."
                                : "Connect your Stripe account if you plan to offer tutoring services."}
                            </p>
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
                              disabled={stripeLoading}
                              onClick={async () => {
                                setStripeLoading(true);
                                try {
                                  // System timezone → country (e.g. Asia/Kolkata → IN)
                                  const country = getCountryFromTimezone();
                                  const res = await fetch(
                                    "/api/stripe/connect/create-account-link",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        email: profile?.email,
                                        country,
                                      }),
                                    }
                                  );
                                  const data = await res.json();
                                  if (data.url) {
                                    sessionStorage.setItem("setupReturnStep", "5");
                                    window.location.href = data.url;
                                  } else {
                                    setStripeLoading(false);
                                    toast.error(data.error || "Failed to connect Stripe");
                                  }
                                } catch {
                                  setStripeLoading(false);
                                  toast.error("Failed to connect Stripe");
                                }
                              }}
                              className="mx-auto group relative flex items-center gap-4 px-6 py-4 rounded-full bg-gradient-to-r from-brand-500 to-brand-500 text-white font-semibold text-lg shadow-lg hover:shadow-2xl transition-all duration-300 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                              <motion.div
                                whileHover={{ rotate: [-5, 5, -5] }}
                                transition={{ duration: 0.5 }}
                                className="bg-white rounded-2xl px-4 py-2 flex items-center justify-center text-brand-600 font-bold text-lg"
                              >
                                stripe
                              </motion.div>
                              <span className="whitespace-nowrap">
                                {stripeLoading ? "Redirecting..." : "Connect with Stripe"}
                              </span>
                              {!stripeLoading && (
                                <motion.div
                                  animate={{ x: [0, 5, 0] }}
                                  transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    repeatType: "loop",
                                    ease: "easeInOut",
                                  }}
                                >
                                  <ArrowRight size={22} />
                                </motion.div>
                              )}
                              <motion.div
                                className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-500 to-brand-500 blur-xl opacity-0 -z-10"
                                animate={{ opacity: [0, 0.3, 0] }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  repeatType: "loop",
                                }}
                              />
                            </motion.button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-between mt-5">
                  <button
                    onClick={() =>
                      setActiveStep(activeStep > 1 ? activeStep - 1 : 1)
                    }
                    className="hidden md:flex items-center gap-2"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    back
                  </button>
                  <button
                    type="button"
                    disabled={
                      loading ||
                      (activeStep == 1 && !educationComplete) ||
                      (activeStep == 4 && !is_all_selected) ||
                      (activeStep == 5 && formData.is_tutor && !stripeConnected)
                    }
                    onClick={() => HandleNextButton()}
                    className={`
    hidden md:flex items-center gap-2 px-6 py-3
    text-white rounded-full font-medium
    transition-all duration-300 ease-in-out
    ${
      loading ||
      (activeStep == 1 && !educationComplete) ||
      (activeStep == 4 && !is_all_selected) ||
      (activeStep == 5 && formData.is_tutor && !stripeConnected)
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

export default SetupWizard;
