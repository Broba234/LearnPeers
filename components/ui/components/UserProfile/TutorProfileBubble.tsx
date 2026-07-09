"use client";

import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { PaymentForm, type CreatedBookingIntent } from "./PaymentForm";
import { SavedCardCheckout } from "./SavedCardCheckout";
import type { SavedCard } from "@/components/payments/cardDisplay";
import { computeCharge, type ChargeBreakdown } from "@/lib/billing";
import { getDateString, generateDateOptions } from "./tutorBooking.utils";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface TutorProfile {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  email?: string;
  phone?: string;
  education?: { degree: string; institution: string; year: number }[];
  experience?: { title: string; description: string; years: number }[];
  rating?: number;
  subjects?: {
    id?: string;
    name: string;
    code: string;
    duration_1?: number | string | null;
    duration_2?: number | string | null;
    duration_3?: number | string | null;
    price_1?: number | string | null;
    price_2?: number | string | null;
    price_3?: number | string | null;
  }[];
  isAvailableNow?: boolean;
  availableSlots?: {
    subject_id?: string;
    start_time?: string | Date | null;
    end_time?: string | Date | null;
    start_date?: string | Date | null;
    end_date?: string | Date | null;
  }[];
}

interface TutorProfileBubbleProps {
  tutor: TutorProfile & { derivedActiveNow?: boolean };
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onBookSession?: (tutor: TutorProfile) => void;
  onConnectNow?: (tutor: TutorProfile) => void;
}

interface CalendarDay {
  date: string;
  slots: string[];
}

const TutorProfileBubble: React.FC<TutorProfileBubbleProps> = ({
  tutor,
  userId,
  isOpen,
  onClose,
  onBookSession,
  onConnectNow,
}) => {
  // NOTE: do not early-return before the hooks below — that breaks the Rules of
  // Hooks (the count would change when `isOpen` toggles). The `!isOpen` guard
  // lives just before the render return instead.
  const isLiveNow = !!(tutor.derivedActiveNow || tutor.isAvailableNow);

  const [step, setStep] = useState<1 | 2>(1);
  const [breakdown, setBreakdown] = useState<ChargeBreakdown | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  // Set-and-forget payment state: the student's saved cards (null while
  // loading) and whether this tutor can actually be charged right now
  // (null = preflight pending/failed → assume payable, the server re-checks).
  const [savedCards, setSavedCards] = useState<SavedCard[] | null>(null);
  const [canCharge, setCanCharge] = useState<boolean | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<"saved" | "new">("new");
  const [saveCard, setSaveCard] = useState(true);
  // True while the card payment (incl. an in-progress 3-D Secure challenge) is
  // settling. Locks the modal shut so a stray close doesn't unmount Stripe
  // Elements mid-authentication and leave the charge stuck "incomplete".
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<
    "0.5" | "1" | "1.5" | any
  >("0.5");
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [bookingTopic, setBookingTopic] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [studentSubjects, setStudentSubjects] = useState<
    { id: string; name: string; code: string }[]
  >([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null
  );

  // Date selection state
  const dateOptions = useMemo(() => generateDateOptions(14), []);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    dateOptions[0].dateStr
  );
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Stripe Elements options MUST be referentially stable: a fresh object on a
  // re-render makes react-stripe-js re-initialise Elements, which tears down an
  // in-progress 3-D Secure challenge → "authentication began but not completed".
  // Deferred-intent mode: the PaymentElement renders from amount/currency alone;
  // the real PaymentIntent (and the booking) is only created when the student
  // hits Pay. setupFutureUsage must mirror what the server puts on the intent.
  const elementsOptions = useMemo(
    () =>
      breakdown
        ? {
            mode: "payment" as const,
            amount: breakdown.amountCents,
            currency: "cad",
            paymentMethodTypes: ["card"],
            ...(saveCard ? { setupFutureUsage: "off_session" as const } : {}),
            appearance: {
              theme: "stripe" as const,
              variables: { borderRadius: "12px" },
            },
          }
        : undefined,
    [breakdown, saveCard]
  );

  // Load the student's saved cards + whether this tutor is payable as soon as
  // the modal opens, so step 1's "Continue" can route straight to the right
  // checkout (one-tap summary / card entry / no-payment request).
  useEffect(() => {
    if (!isOpen || !tutor.id) return;
    let cancelled = false;
    fetch("/api/stripe/payment-method")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setSavedCards(Array.isArray(d.cards) ? d.cards : []);
      })
      .catch(() => {
        if (!cancelled) setSavedCards([]);
      });
    fetch(
      `/api/stripe/create-session-payment-intent?tutorId=${encodeURIComponent(tutor.id)}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && typeof d.canCharge === "boolean") setCanCharge(d.canCharge);
      })
      .catch(() => {
        /* leave null → assume payable; the server re-checks on POST */
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, tutor.id]);

  const timeZoneLabel =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const durationOptions = [
    { value: "0.5" as const, label: "30 min" },
    { value: "1" as const, label: "1 hr" },
    { value: "1.5" as const, label: "1.5 hr" },
  ];

  // Fetch calendar data for this tutor
  const fetchCalendar = useCallback(async () => {
    if (!tutor.id) return;
    setCalendarLoading(true);
    try {
      const res = await fetch(
        `/api/tutor-availability/calendar?tutorId=${encodeURIComponent(tutor.id)}&days=14`
      );
      if (res.ok) {
        const data = await res.json();
        setCalendarData(data.days || []);
      }
    } catch {
      setCalendarData([]);
    } finally {
      setCalendarLoading(false);
    }
  }, [tutor.id]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // When the calendar first loads, jump to the earliest date that actually has
  // availability instead of leaving the user on an empty "Today". Runs once so
  // it never fights a date the user picks themselves.
  const autoPickedDateRef = useRef(false);
  useEffect(() => {
    if (autoPickedDateRef.current || calendarLoading || calendarData.length === 0)
      return;
    autoPickedDateRef.current = true;
    const hasSlots = (ds: string) =>
      calendarData.some((d) => d.date === ds && d.slots.length > 0);
    if (!hasSlots(selectedDateStr)) {
      const firstWithSlots = dateOptions.find(({ dateStr }) => hasSlots(dateStr));
      if (firstWithSlots) setSelectedDateStr(firstWithSlots.dateStr);
    }
  }, [calendarLoading, calendarData, selectedDateStr, dateOptions]);

  // Get slots for the selected date from calendar data
  const slotsForSelectedDate = useMemo(() => {
    const dayData = calendarData.find((d) => d.date === selectedDateStr);
    if (!dayData || !dayData.slots.length) return [];
    return dayData.slots;
  }, [calendarData, selectedDateStr]);

  // Convert calendar slots (HH:MM strings) into minute-based slots filtered by duration
  const timeSlots = useMemo(() => {
    const durationMinutes = Number(selectedDuration) * 60;
    const slotMinutes = slotsForSelectedDate.map((s) => {
      const [h, m] = s.split(":").map(Number);
      return h * 60 + m;
    });
    if (slotMinutes.length === 0) return [];

    // API already filters past slots server-side — no client-side time filtering needed
    // (client-side filtering causes bugs when browser timezone differs from slot timezone)
    const sorted = [...slotMinutes].sort((a, b) => a - b);
    const ranges: { start: number; end: number }[] = [];
    let rangeStart = sorted[0];
    let prev = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === prev + 30) {
        prev = sorted[i];
      } else {
        ranges.push({ start: rangeStart, end: prev + 30 });
        rangeStart = sorted[i];
        prev = sorted[i];
      }
    }
    ranges.push({ start: rangeStart, end: prev + 30 });

    const result: number[] = [];
    for (const range of ranges) {
      for (
        let t = range.start;
        t + durationMinutes <= range.end;
        t += 30
      ) {
        result.push(t);
      }
    }
    return result;
  }, [selectedDuration, slotsForSelectedDate, selectedDateStr]);

  // Default to the earliest slot so the form starts complete — the user scans
  // and adjusts instead of building the booking from scratch.
  useEffect(() => {
    if (calendarLoading) return;
    if (timeSlots.length === 0) {
      setSelectedTime(null);
      return;
    }
    setSelectedTime((prev) =>
      prev !== null && timeSlots.includes(prev) ? prev : timeSlots[0]
    );
  }, [timeSlots, calendarLoading]);

  const selectedTutorSubject = useMemo(() => {
    if (!Array.isArray(tutor.subjects) || tutor.subjects.length === 0) {
      return undefined;
    }
    if (selectedSubjectId) {
      const match = tutor.subjects.find(
        (s) => s.id && s.id === selectedSubjectId
      );
      if (match) return match;
    }
    return tutor.subjects[0];
  }, [tutor.subjects, selectedSubjectId]);

  const studentSubjectsForTutor = useMemo(() => {
    if (!Array.isArray(studentSubjects) || studentSubjects.length === 0) {
      return [];
    }
    if (!Array.isArray(tutor.subjects) || tutor.subjects.length === 0) {
      return studentSubjects;
    }
    const tutorIds = new Set(
      tutor.subjects
        .map((s) => s.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    );
    const filtered = studentSubjects.filter((s) => tutorIds.has(s.id));
    return filtered.length > 0 ? filtered : studentSubjects;
  }, [studentSubjects, tutor.subjects]);

  useEffect(() => {
    const fetchStudentSubjects = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (!user || error || !user.email) return;

        const res = await fetch(
          `/api/profiles/get-full?email=${encodeURIComponent(user.email)}`
        );
        if (!res.ok) return;
        const profile = await res.json();

        const rawSubjects = Array.isArray(profile?.subjects)
          ? profile.subjects
          : [];
        const normalized = rawSubjects
          .map((s: any) => {
            if (s && typeof s.id === "string") return s;
            if (s?.Subjects && typeof s.Subjects.id === "string")
              return s.Subjects;
            if (s?.subject && typeof s.subject.id === "string")
              return s.subject;
            return undefined;
          })
          .filter(
            (s: any): s is { id: string; name: string; code: string } =>
              !!s &&
              typeof s.id === "string" &&
              s.id.length > 0 &&
              typeof s.name === "string" &&
              typeof s.code === "string"
          );

        setStudentSubjects(normalized);
        if (!selectedSubjectId && normalized.length > 0) {
          setSelectedSubjectId(normalized[0].id);
        }
      } catch {
        setStudentSubjects([]);
      }
    };

    fetchStudentSubjects();
  }, [selectedSubjectId]);

  const getSessionPrice = (durationValue: string) => {
    if (!selectedTutorSubject) return null;
    const getNumber = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    if (durationValue === "0.5") return getNumber(selectedTutorSubject.price_1);
    if (durationValue === "1") return getNumber(selectedTutorSubject.price_2);
    if (durationValue === "1.5") return getNumber(selectedTutorSubject.price_3);
    return null;
  };

  // Cheapest per-hour duration for this subject; null when the tutor's rates
  // are flat (no honest "best value" to point at).
  const bestValueDuration = (() => {
    let best: { value: string; rate: number } | null = null;
    let worstRate: number | null = null;
    for (const option of durationOptions) {
      const price = getSessionPrice(option.value);
      if (price === null) continue;
      const rate = price / Number(option.value);
      if (best === null || rate < best.rate) best = { value: option.value, rate };
      if (worstRate === null || rate > worstRate) worstRate = rate;
    }
    if (!best || worstRate === null || worstRate - best.rate < 0.005) return null;
    return best.value;
  })();

  const formatTimeLabel = (minutes: number) => {
    const hour24 = Math.floor(minutes / 60) % 24;
    const minute = minutes % 60;
    const hour12 = hour24 % 12 || 12;
    const suffix = hour24 >= 12 ? "PM" : "AM";
    return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
  };

  const minutesToTimeString = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:00`;
  };

  /** The booking fields shared by every payment path, from current form state. */
  const buildBookingPayload = () => {
    const subjectIdForBooking =
      selectedSubjectId && selectedSubjectId.length > 0
        ? selectedSubjectId
        : selectedTutorSubject && typeof selectedTutorSubject.id === "string"
          ? selectedTutorSubject.id
          : undefined;
    return {
      tutorId: tutor.id,
      start_time: selectedTime !== null ? minutesToTimeString(selectedTime) : undefined,
      duration: Number(selectedDuration),
      topic: bookingTopic.trim() || undefined,
      notes: bookingNotes.trim() || undefined,
      date: selectedDateStr,
      subjectId: subjectIdForBooking,
    };
  };

  const handleSkipPayment = () => {
    toast.success(
      `Session requested with ${tutor.name}! They'll confirm shortly. Payment is settled later.`
    );
    onBookSession?.(tutor);
    onClose();
  };

  /**
   * Step 1 → checkout. Nothing is created server-side here (the booking and
   * its charge happen together at pay time); this just routes to the right
   * step-2 — one-tap saved card, new-card entry — or, for tutors who can't be
   * charged yet, books immediately without payment like the old flow.
   */
  const handleConfirm = async () => {
    if (!tutor || !userId || !selectedTime) {
      toast.error("Please select a time slot");
      return;
    }

    const amount =
      getSessionPrice(String(selectedDuration)) ?? Number(selectedDuration);
    if (typeof amount !== "number" || amount <= 0) {
      toast.error("Invalid session price");
      return;
    }

    // Tutor isn't payable → request the session without payment (server
    // re-verifies; if it disagrees it answers requiresPayment and we fall
    // through to the normal checkout).
    if (canCharge === false) {
      setPaymentLoading(true);
      try {
        const res = await fetch("/api/stripe/create-session-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...buildBookingPayload(), mode: "no_payment" }),
        });
        const data = await res.json();
        if (data.skipPayment) {
          handleSkipPayment();
          return;
        }
        if (!res.ok && !data.requiresPayment) {
          toast.error(data.error || "Failed to create booking");
          return;
        }
        setCanCharge(true); // stale preflight — run the real payment flow
      } catch (err) {
        console.error("Booking error:", err);
        toast.error("An error occurred. Please try again.");
        return;
      } finally {
        setPaymentLoading(false);
      }
    }

    // Display-only breakdown; the server recomputes all amounts from its own
    // price lookup when the charge is created.
    setBreakdown(computeCharge(amount));
    setCheckoutMode(savedCards && savedCards.length > 0 ? "saved" : "new");
    setSaveCard(true);
    setStep(2);
  };

  /** Creates the awaiting_payment draft + PaymentIntent (new-card path). */
  const createNewCardIntent = async (): Promise<CreatedBookingIntent> => {
    try {
      const res = await fetch("/api/stripe/create-session-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildBookingPayload(), saveCard }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Failed to create booking" };
      return data;
    } catch {
      return { error: "An error occurred. Please try again." };
    }
  };

  /** One-tap path: server creates AND confirms the charge on the saved card. */
  const createAndConfirmWithSavedCard = async (paymentMethodId: string) => {
    const res = await fetch("/api/stripe/create-session-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...buildBookingPayload(), paymentMethodId }),
    });
    return res.json();
  };

  const handlePaymentSuccess = () => {
    toast.success(`Session successfully booked with ${tutor.name}! Payment complete.`);
    setStep(1);
    setBreakdown(null);
    setSelectedTime(null);
    setBookingTopic("");
    setBookingNotes("");
    onBookSession?.(tutor);
    onClose();
  };

  const handleBackToBooking = () => {
    setStep(1);
    setBreakdown(null);
  };

  const formatDateLabel = (date: Date, dateStr: string) => {
    if (dateStr === dateOptions[0].dateStr) return "Today";
    if (dateStr === dateOptions[1]?.dateStr) return "Tomorrow";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
          <img
            src={tutor.avatar || "/default-avatar.png"}
            alt={tutor.name || "Tutor"}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-brand-100"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {tutor.name}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {tutor.rating && (
                <>
                  <span className="text-amber-500">★</span>
                  <span className="font-medium text-gray-700">
                    {tutor.rating}
                  </span>
                  <span className="text-gray-300">·</span>
                </>
              )}
              {tutor.subjects && tutor.subjects.length > 0 && (
                <span className="truncate">
                  {tutor.subjects.map((s) => s.code).join(", ")}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={paymentProcessing}
            title={paymentProcessing ? "Please wait — completing your payment…" : "Close"}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 2 && stripePromise && breakdown ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {checkoutMode === "saved" ? "Confirm & Pay" : "Complete Payment"}
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                Pay securely with Stripe
              </p>
              {checkoutMode === "saved" && savedCards && savedCards.length > 0 ? (
                <SavedCardCheckout
                  cards={savedCards}
                  breakdown={breakdown}
                  tutorName={tutor.name || "Tutor"}
                  stripePromise={stripePromise}
                  createAndConfirm={createAndConfirmWithSavedCard}
                  onSuccess={handlePaymentSuccess}
                  onSkipPayment={handleSkipPayment}
                  onUseNewCard={() => setCheckoutMode("new")}
                  onBack={handleBackToBooking}
                  onProcessingChange={setPaymentProcessing}
                />
              ) : (
                <Elements stripe={stripePromise} options={elementsOptions}>
                  <PaymentForm
                    breakdown={breakdown}
                    tutorName={tutor.name || "Tutor"}
                    saveCard={saveCard}
                    onSaveCardChange={setSaveCard}
                    createIntent={createNewCardIntent}
                    onSuccess={handlePaymentSuccess}
                    onSkipPayment={handleSkipPayment}
                    onBack={handleBackToBooking}
                    onProcessingChange={setPaymentProcessing}
                  />
                </Elements>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Connect now — only when the tutor is live */}
              {isLiveNow && onConnectNow && (
                <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <p className="text-sm font-semibold text-emerald-800">Online now</p>
                    </div>
                    <p className="text-xs text-emerald-700/80 mt-0.5">Skip the wait — start a live session right now.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onConnectNow(tutor)}
                    className="flex-shrink-0 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Connect now
                  </button>
                </div>
              )}

              {isLiveNow && onConnectNow && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs font-medium text-gray-400">or book ahead</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              )}

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
                  {dateOptions.map(({ date, dateStr }) => {
                    const hasSlots = calendarData.some(
                      (d) => d.date === dateStr && d.slots.length > 0
                    );
                    const isSelected = selectedDateStr === dateStr;
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => {
                          setSelectedDateStr(dateStr);
                          setSelectedTime(null);
                        }}
                        className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium border transition-all min-w-[4.5rem] ${
                          isSelected
                            ? "bg-brand-600 text-white border-brand-600"
                            : hasSlots
                              ? "bg-white text-gray-700 border-gray-200 hover:border-brand-300"
                              : "bg-gray-50 text-gray-400 border-gray-100"
                        }`}
                      >
                        <span className="text-[10px] uppercase tracking-wide opacity-75">
                          {date.toLocaleDateString("en-US", {
                            weekday: "short",
                          })}
                        </span>
                        <span className="text-lg font-semibold leading-tight">
                          {date.getDate()}
                        </span>
                        <span className="text-[10px] opacity-75">
                          {date.toLocaleDateString("en-US", {
                            month: "short",
                          })}
                        </span>
                        <span className={`w-1 h-1 rounded-full mt-0.5 ${hasSlots && !isSelected ? "bg-emerald-400" : "bg-transparent"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration
                </label>
                <div className="flex gap-2">
                  {durationOptions.map((option) => {
                    const price = getSessionPrice(String(option.value));
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSelectedDuration(option.value);
                          setSelectedTime(null);
                        }}
                        className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          selectedDuration === option.value
                            ? "bg-brand-600 text-white border-brand-600"
                            : "bg-white text-gray-700 border-gray-200 hover:border-brand-300"
                        }`}
                      >
                        {option.label}
                        {price !== null && (
                          <span
                            className={`block text-xs mt-0.5 ${selectedDuration === option.value ? "text-brand-200" : "text-gray-400"}`}
                          >
                            ${price.toFixed(2)}
                          </span>
                        )}
                        {option.value === bestValueDuration && (
                          <span
                            className={`block text-[10px] font-semibold mt-0.5 ${
                              selectedDuration === option.value
                                ? "text-emerald-200"
                                : "text-emerald-600"
                            }`}
                          >
                            Best value
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Available Slots
                  </label>
                  <span className="text-xs text-gray-400">{timeZoneLabel}</span>
                </div>

                {calendarLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                    <span className="ml-2 text-sm text-gray-500">
                      Loading availability…
                    </span>
                  </div>
                ) : timeSlots.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto">
                    {timeSlots.map((slotMinutes) => (
                      <button
                        key={slotMinutes}
                        type="button"
                        onClick={() => setSelectedTime(slotMinutes)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                          selectedTime === slotMinutes
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-gray-700 border-gray-200 hover:border-emerald-300"
                        }`}
                      >
                        {formatTimeLabel(slotMinutes)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">
                      No slots available on this date
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try a different date or duration
                    </p>
                  </div>
                )}
              </div>

              {/* Session Details */}
              <div className="space-y-3">
                {studentSubjectsForTutor.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Subject
                    </label>
                    <SearchableSelect
                      value={selectedSubjectId ?? ""}
                      onChange={(val) => setSelectedSubjectId(val || selectedSubjectId)}
                      options={studentSubjectsForTutor.map((subject: any) => ({ value: subject.id, label: `${subject.name} (${subject.code})` }))}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100 transition-all"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="booking-topic" className="block text-xs font-medium text-gray-600 mb-1">
                    Topic{" "}
                    <span className="text-gray-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="booking-topic"
                    type="text"
                    value={bookingTopic}
                    onChange={(e) => setBookingTopic(e.target.value)}
                    placeholder="What would you like to study?"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="booking-notes" className="block text-xs font-medium text-gray-600 mb-1">
                    Notes{" "}
                    <span className="text-gray-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    id="booking-notes"
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Any specific requirements?"
                    rows={2}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Summary + Action */}
              <div className="pt-4 border-t border-gray-100">
                {selectedTime !== null && (
                  <div className="mb-4 p-3 bg-brand-50 rounded-xl text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">
                        {formatDateLabel(
                          dateOptions.find(
                            (d) => d.dateStr === selectedDateStr
                          )!.date,
                          selectedDateStr
                        )}{" "}
                        at{" "}
                        <span className="font-semibold text-gray-900">
                          {formatTimeLabel(selectedTime)}
                        </span>
                      </span>
                      <span className="font-semibold text-brand-700">
                        {selectedDuration === "0.5"
                          ? "30 min"
                          : selectedDuration === "1"
                            ? "60 min"
                            : "90 min"}
                        {getSessionPrice(String(selectedDuration)) !== null && (
                          <span className="ml-1">
                            · $
                            {getSessionPrice(
                              String(selectedDuration)
                            )!.toFixed(2)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={selectedTime === null || paymentLoading}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {paymentLoading
                      ? "Preparing…"
                      : canCharge === false
                        ? "Request Session"
                        : "Continue"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorProfileBubble;
