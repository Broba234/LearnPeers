"use client";

import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

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
  tutor: TutorProfile;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onBookSession?: (tutor: TutorProfile) => void;
}

interface CalendarDay {
  date: string;
  slots: string[];
}

function PaymentForm({
  sessionId,
  amount,
  tutorName,
  onSuccess,
  onBack,
}: {
  sessionId: string;
  amount: number;
  tutorName: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      const returnUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}?sessionId=${sessionId}`
          : "";

      const { error: submitError, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: returnUrl,
            receipt_email: undefined,
            payment_method_data: {
              billing_details: {
                address: { country: "US" },
              },
            },
          },
          redirect: "if_required",
        });

      if (submitError) {
        setError(submitError.message || "Payment failed");
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        const res = await fetch("/api/sessions/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (res.ok) {
          onSuccess();
        } else {
          const data = await res.json();
          setError(data.error || "Failed to confirm session");
        }
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="p-4 bg-indigo-50 rounded-xl space-y-1.5 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Session price</span>
          <span className="text-gray-800">${amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Platform fee (5%)</span>
          <span className="text-gray-800">+${(amount * 0.05).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center border-t border-indigo-200 pt-1.5">
          <span className="font-semibold text-gray-800">Total charged</span>
          <span className="font-bold text-indigo-700">${(amount * 1.05).toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-500 pt-0.5">
          {tutorName} receives ${(amount * 0.95).toFixed(2)} (5% platform fee deducted from payout)
        </p>
      </div>

      <div className="min-h-[200px]">
        <PaymentElement options={{ layout: "tabs" }} onReady={() => setElementReady(true)} />
      </div>

      {error && (
        <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || !elementReady || loading}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Processing…" : "Pay now"}
        </button>
      </div>
    </form>
  );
}

function getDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function generateDateOptions(count: number): { date: Date; dateStr: string }[] {
  const dates: { date: Date; dateStr: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    dates.push({ date: d, dateStr: getDateString(d) });
  }
  return dates;
}

const TutorProfileBubble: React.FC<TutorProfileBubbleProps> = ({
  tutor,
  userId,
  isOpen,
  onClose,
  onBookSession,
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<1 | 2>(1);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
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

    setPaymentLoading(true);
    try {
      const bookingTime = minutesToTimeString(selectedTime);
      const subjectIdForBooking =
        selectedSubjectId && selectedSubjectId.length > 0
          ? selectedSubjectId
          : selectedTutorSubject && typeof selectedTutorSubject.id === "string"
            ? selectedTutorSubject.id
            : undefined;

      const res = await fetch("/api/stripe/create-session-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: tutor.id,
          studentId: userId,
          amount,
          start_time: bookingTime,
          duration: Number(selectedDuration),
          topic: bookingTopic.trim() || undefined,
          notes: bookingNotes.trim() || undefined,
          date: selectedDateStr,
          subjectId: subjectIdForBooking,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create payment");
        setPaymentLoading(false);
        return;
      }

      setClientSecret(data.clientSecret);
      setSessionId(data.sessionId);
      setStep(2);
    } catch (err) {
      console.error("Payment intent error:", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    toast.success(`Session successfully booked with ${tutor.name}! Payment complete.`);
    setStep(1);
    setClientSecret(null);
    setSessionId(null);
    setSelectedTime(null);
    setBookingTopic("");
    setBookingNotes("");
    onBookSession?.(tutor);
    onClose();
  };

  const handleBackToBooking = () => {
    setStep(1);
    setClientSecret(null);
    setSessionId(null);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
          <img
            src={tutor.avatar || "/default-avatar.png"}
            alt={tutor.name || "Tutor"}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-100"
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
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
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
          {step === 2 && clientSecret && stripePromise && sessionId ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Complete Payment
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                Pay securely with Stripe
              </p>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: { borderRadius: "12px" },
                  },
                }}
              >
                <PaymentForm
                  sessionId={sessionId}
                  amount={
                    getSessionPrice(String(selectedDuration)) ??
                    Number(selectedDuration)
                  }
                  tutorName={tutor.name || "Tutor"}
                  onSuccess={handlePaymentSuccess}
                  onBack={handleBackToBooking}
                />
              </Elements>
            </div>
          ) : (
            <div className="space-y-6">
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
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : hasSlots
                              ? "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
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
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
                        }`}
                      >
                        {option.label}
                        {price !== null && (
                          <span
                            className={`block text-xs mt-0.5 ${selectedDuration === option.value ? "text-indigo-200" : "text-gray-400"}`}
                          >
                            ${price.toFixed(2)}
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
                    <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
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
                    <select
                      value={selectedSubjectId ?? ""}
                      onChange={(e) =>
                        setSelectedSubjectId(
                          e.target.value || selectedSubjectId
                        )
                      }
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                    >
                      {studentSubjectsForTutor.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Topic{" "}
                    <span className="text-gray-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={bookingTopic}
                    onChange={(e) => setBookingTopic(e.target.value)}
                    placeholder="What would you like to study?"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Notes{" "}
                    <span className="text-gray-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Any specific requirements?"
                    rows={2}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Summary + Action */}
              <div className="pt-4 border-t border-gray-100">
                {selectedTime !== null && (
                  <div className="mb-4 p-3 bg-indigo-50 rounded-xl text-sm">
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
                      <span className="font-semibold text-indigo-700">
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
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {paymentLoading ? "Preparing…" : "Confirm & Pay"}
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
