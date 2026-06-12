import React, { useState, useEffect, useRef } from "react";
import moment from "moment";
import {
  X,
  Clock,
  Calendar as CalendarIcon,
  DollarSign,
  BookOpen,
  User,
  FileText,
  MapPin,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any | null;
  onDelete: (eventId: string) => void;
  onUpdate: (eventId: string, updatedData: any) => void;
}

interface UpdateFormData {
  subject_id: string;
  subject: string;
  price: string;
  duration_1: number;
  duration_2: number;
  duration_3: number;
  startTime: string;
  endTime: string;
  date: string;
  endDate: string;
}

interface Subject {
  id: string;
  name: string;
  code: string | null;
  grade: string | null;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  onClose,
  event,
  onDelete,
  onUpdate,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
  const [selectedDurations, setSelectedDurations] = useState<
    Array<{ duration: number; price: number }>
  >([]);
  const [profileSubjectDetails, setProfileSubjectDetails] = useState<{
    duration_1: number;
    duration_2: number;
    duration_3: number;
    price_1: number;
    price_2: number;
    price_3: number;
  } | null>(null);
  const [activeDurationSubjectId, setActiveDurationSubjectId] = useState<
    string | null
  >(null);
  const durationDropdownRef = useRef<HTMLDivElement>(null);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [updateForm, setUpdateForm] = useState<UpdateFormData>({
    subject_id: "",
    subject: "",
    price: "",
    duration_1: 0,
    duration_2: 0,
    duration_3: 0,
    startTime: "",
    endTime: "",
    date: "",
    endDate: "",
  });

  // Fetch subjects when modal opens in edit mode
  useEffect(() => {
    if (isOpen && isEditMode) {
      const fetchSubjects = async () => {
        setLoadingSubjects(true);
        try {
          const {
            data: { user },
            error: sessionError,
          } = await supabase.auth.getUser();

          if (sessionError || !user?.email) {
            console.error("Error getting user:", sessionError);
            setLoadingSubjects(false);
            return;
          }

          const profileRes = await fetch(
            `/api/tutor-availability/event?id=${encodeURIComponent(
              event.id
            )}`
          );

          if (profileRes.ok) {
            const profileData = await profileRes.json();
            console.log("profileData", profileData);
            setProfileSubjectDetails(profileData.profileSubject || null);
            setUpdateForm((prev) => ({
              ...prev,
              duration_1: profileData.duration_1 || 0,
              duration_2: profileData.duration_2 || 0,
              duration_3: profileData.duration_3 || 0,
            }));
            setSelectedSubject(profileData.subjects || null);
           
          }
        } catch (error) {
        } finally {
          setLoadingSubjects(false);
        }
      };

      fetchSubjects();
    }
  }, [isOpen, isEditMode]);
  const formatDuration = (duration: number) => {
    if (duration === 1) return "1h";
    if (duration === 0.5) return "30m";
    if (duration === 1.5) return "1h 30m";
    return `${duration}h`;
  };
  console.log("selectedDurations", selectedDurations);

  useEffect(() => {
    if (!profileSubjectDetails) return;
    const durations: Array<{ duration: number; price: number }> = [];
    if (updateForm.duration_1) {
      durations.push({
        duration: profileSubjectDetails.duration_1,
        price: profileSubjectDetails.price_1,
      });
    }
    if (updateForm.duration_2) {
      durations.push({
        duration: profileSubjectDetails.duration_2,
        price: profileSubjectDetails.price_2,
      });
    }
    if (updateForm.duration_3) {
      durations.push({
        duration: profileSubjectDetails.duration_3,
        price: profileSubjectDetails.price_3,
      });
    }
    setSelectedDurations(durations);
  }, [
    profileSubjectDetails,
    updateForm.duration_1,
    updateForm.duration_2,
    updateForm.duration_3,
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        durationDropdownRef.current &&
        !durationDropdownRef.current.contains(event.target as Node)
      ) {
        const hasAnyDuration =
          !!updateForm.duration_1 ||
          !!updateForm.duration_2 ||
          !!updateForm.duration_3;
        if (hasAnyDuration) {
          setActiveDurationSubjectId(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [updateForm.duration_1, updateForm.duration_2, updateForm.duration_3]);
  useEffect(() => {
    if (event && isEditMode) {
     console.log('even2222t', event);
      const subjectId =
        event.originalData?.id || event.id || "";
      const subjectName =
        event.title || event.originalData?.subject || event.subject || "";

      setUpdateForm((prev) => ({
        ...prev,
        subject_id: subjectId,
        subject: subjectName,
        price: event.price?.toString() || "",
        startTime: moment(event.start).format("HH:mm"),
        endTime: moment(event.end).format("HH:mm"),
        date: moment(event.start).format("YYYY-MM-DD"),
        endDate: moment(event.end).format("YYYY-MM-DD"),
      }));
    }
  }, [event, isEditMode]);

  if (!isOpen || !event) return null;
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const startDateTime = moment(
      `${updateForm.date} ${updateForm.startTime}`
    ).toDate();
    const endDateTime = moment(
      `${updateForm.endDate} ${updateForm.endTime}`
    ).toDate();

    if (endDateTime <= startDateTime) {
      toast.error("End time must be after start time");
      return;
    }

    if (!updateForm.subject_id) {
      toast.error("Please select a subject");
      return;
    }
    const subjectName = selectedSubject?.name || updateForm.subject;

    // Get user email for tutor_id resolution
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const updatedEvent = {
      duration_1: updateForm.duration_1,
      duration_2: updateForm.duration_2,
      duration_3: updateForm.duration_3,
      start: startDateTime,
      end: endDateTime,
      date: updateForm.date, // "YYYY-MM-DD"
      startTime: updateForm.startTime, // "HH:mm"
      endDate: updateForm.endDate, // "YYYY-MM-DD"
      endTime: updateForm.endTime, // "HH:mm"
      start_time: updateForm.startTime,
      end_time: updateForm.endTime,
      price: updateForm.price,
      subject_id: updateForm.subject_id,
      subject: subjectName,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    };

    // Call the API to update
    try {
      const res = await fetch("/api/tutor-availability/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          updatedData: updatedEvent,
          email: user?.email,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(`Error updating event: ${errorData.error || "Unknown error"}`);
        return;
      }
      onUpdate(event.id, {
        ...event,
        ...updatedEvent,
        title: subjectName,
      });

      setIsEditMode(false);
      onClose();
    } catch (error: any) {
      console.error("Error updating event:", error);
      toast.error("Error updating event. Please try again.");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setUpdateForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDurationChange = (
    durationKey: "duration_1" | "duration_2" | "duration_3"
  ) => {
    setUpdateForm((prev) => {
      const next = { ...prev, [durationKey]: prev[durationKey] ? 0 : 1 };
      return next;
    });
  };

  const startTime = moment(event.start).format("h:mm A");
  const endTime = moment(event.end).format("h:mm A");
  const startDateStr = moment(event.start).format("MMMM Do, YYYY");
  const endDateStr = moment(event.end).format("MMMM Do, YYYY");
  const isMultiDay = moment(event.end).date() !== moment(event.start).date();
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex relative m-2.5 text-white h-24 rounded-md bg-slate-800 justify-between items-center border-b px-6 py-4">
          <div className="flex items-center gap-3">
            {isEditMode ? (
              <h2 className="text-2xl font-bold text-white">Edit Event</h2>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {event.title || event.subject || "Event"}
                </h2>
                {event.originalData?.subject && (
                  <p className="text-gray-300 text-sm mt-1">
                    Subject: {event.originalData.subject}
                  </p>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-200 hover:text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {isEditMode ? (
            // Edit Mode Form
            <form onSubmit={handleUpdateSubmit}>
              <div className="space-y-6">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Subject *
                  </label>
                  {loadingSubjects ? (
                    <p className="text-sm text-gray-500">Loading subjects...</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            key={selectedSubject?.id}
                            onClick={() =>
                              setActiveDurationSubjectId(
                                selectedSubject?.id || null
                              )
                            }
                            className={`inline-flex items-center gap-1 border rounded-lg text-xs px-3 py-1.5 shadow-sm transition-all duration-150 cursor-pointer ${
                              updateForm.subject_id === selectedSubject?.id
                                ? "bg-gradient-to-r from-brand-500 to-brand-500 text-white border-brand-700 ring-2 ring-brand-200"
                                : "bg-white border-gray-200 hover:border-brand-300 hover:bg-brand-50"
                            }`}
                          >
                            <span className="font-semibold">
                              {selectedSubject?.name}
                            </span>
                            {selectedSubject?.code && (
                              <span className="text-[10px] opacity-80">
                                {selectedSubject?.code}
                              </span>
                            )}
                            {selectedSubject?.grade && (
                              <span className="text-[10px] opacity-70">
                                · Grade {selectedSubject?.grade}
                              </span>
                            )}
                            {selectedDurations.length > 0 && (
                              <span className="ml-1 inline-flex items-center gap-1 text-[10px] opacity-90">
                                {selectedDurations.map((item, index) => (
                                  <React.Fragment
                                    key={`${item.duration}-${item.price}-${index}`}
                                  >
                                    {index > 0 && (
                                      <span className="opacity-60">/</span>
                                    )}
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDuration(item.duration)}</span>
                                    <span className="opacity-60">•</span>
                                    <DollarSign className="w-3 h-3" />
                                    <span>${item.price}</span>
                                  </React.Fragment>
                                ))}
                              </span>
                            )}
                          </button>
                    </div>
                  )}
                  {activeDurationSubjectId === selectedSubject?.id &&
                    selectedSubject?.id && (
                      <div className="relative mt-3" ref={durationDropdownRef}>
                        <div className="absolute z-10 mt-2 w-44 rounded-md border border-gray-200 bg-white p-3 shadow-lg">
                          <label className="flex items-center gap-2 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={!!updateForm.duration_1}
                              onChange={() =>
                                handleDurationChange("duration_1")
                              }
                              className="h-3.5 w-3.5"
                            />
                            30 Min
                          </label>
                          <label className="mt-2 flex items-center gap-2 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={!!updateForm.duration_2}
                              onChange={() =>
                                handleDurationChange("duration_2")
                              }
                              className="h-3.5 w-3.5"
                            />
                            1 Hour
                          </label>
                          <label className="mt-2 flex items-center gap-2 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={!!updateForm.duration_3}
                              onChange={() =>
                                handleDurationChange("duration_3")
                              }
                              className="h-3.5 w-3.5"
                            />
                            1.5 Hour
                          </label>
                        </div>
                      </div>
                    )}
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      Start Date *
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={updateForm.date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      End Date *
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={updateForm.endDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                      required
                    />
                  </div>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Start Time *
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      value={updateForm.startTime}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      End Time *
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      value={updateForm.endTime}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                      required
                    />
                  </div>
                </div>
              </div>
            </form>
          ) : (
            // View Mode
            <>
              {/* Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <CalendarIcon className="w-5 h-5 text-brand-600" />
                    <h3 className="font-semibold text-gray-700">Date</h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-800 font-medium">
                      {isMultiDay ? (
                        <>
                          {startDateStr}{" "}
                          <span className="text-gray-500">to</span> {endDateStr}
                        </>
                      ) : (
                        startDateStr
                      )}
                    </p>
                    {isMultiDay && (
                      <p className="text-sm text-gray-500">
                        {moment(event.end).diff(moment(event.start), "days") +
                          1}{" "}
                        days
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-brand-600" />
                    <h3 className="font-semibold text-gray-700">
                      Time & Duration
                    </h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-800 font-medium">
                      {startTime} - {endTime}
                    </p>
                    <div className="flex justify-between items-center">
                      {isMultiDay && (
                        <span className="text-xs bg-brand-100 text-brand-800 px-2 py-1 rounded">
                          Multi-day
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Subject & Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen className="w-5 h-5 text-brand-600" />
                    <h3 className="font-semibold text-gray-700">Subject</h3>
                  </div>
                  <p className="text-gray-800 font-medium">
                    {event.title ||
                      event.subject ||
                      event.originalData?.subject ||
                      "Not specified"}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="border-t p-6">
          <div className="flex justify-between gap-3">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="rounded-full border border-gray-300 px-5 py-2.5 text-center text-sm transition-all text-slate-600 hover:bg-slate-200 focus:bg-slate-100 active:bg-slate-100 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
              >
                Cancel
              </button>
            </div>

            <div className="flex gap-3">
              {isEditMode ? (
                <>
                  <button
                    onClick={() => setIsEditMode(false)}
                    className="rounded-full border border-gray-300 px-5 py-2.5 text-center text-sm transition-all text-slate-600 hover:bg-slate-200 focus:bg-slate-100 active:bg-slate-100"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleUpdateSubmit}
                    className="px-5 py-2.5 bg-brand-600 text-white rounded-full hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
                  >
                    Update Event
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="px-5 py-2.5 bg-brand-600 text-white rounded-full hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        !window.confirm(
                          "Are you sure you want to delete this event?"
                        )
                      )
                        return;

                      try {
                        const res = await fetch(
                          "/api/tutor-availability/delete",
                          {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ eventId: event.id }),
                          }
                        );

                        if (!res.ok) {
                          const err = await res.json().catch(() => ({}));
                          toast.error(
                            `Error deleting event: ${
                              err.error || res.statusText
                            }`
                          );
                          return;
                        }

                        onDelete(event.id); // update local state
                        onClose();
                      } catch (e: any) {
                        console.error("Error deleting event:", e);
                        toast.error("Error deleting event. Please try again.");
                      }
                    }}
                    className="px-5 py-2.5 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
