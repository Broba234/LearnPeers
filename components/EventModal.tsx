"use client";

import React, { useState, useEffect, useRef } from "react";
import { BookOpen, Clock, X } from "lucide-react";
import { toast } from "sonner";

export interface EventFormData {
  id: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  subject?: string;
  subject_id?: string;
  timezone?: string;
  duration_1?: number;
  duration_2?: number;
  duration_3?: number;
  day_of_week?: number;
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EventFormData) => void;
  defaultStart: Date;
  defaultEnd: Date;
  subjects?: any[];
}

const DAYS = [
  { label: "M", name: "Mon", idx: 1 },
  { label: "T", name: "Tue", idx: 2 },
  { label: "W", name: "Wed", idx: 3 },
  { label: "T", name: "Thu", idx: 4 },
  { label: "F", name: "Fri", idx: 5 },
  { label: "S", name: "Sat", idx: 6 },
  { label: "S", name: "Sun", idx: 0 },
];

// slot 0 = 00:00, slot 48 = 24:00 (midnight end of day), step = 30 min
function slotToHHmm(slot: number): string {
  const h = Math.floor(slot / 2) % 24;
  const m = slot % 2 === 1 ? 30 : 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function slotToLabel(slot: number): string {
  if (slot === 48) return "12:00 AM";
  const h = Math.floor(slot / 2);
  const m = slot % 2 === 1 ? 30 : 0;
  const period = h < 12 ? "AM" : "PM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

function nextDateForDay(dayIdx: number): string {
  const today = new Date();
  const todayDay = today.getDay();
  const daysUntil = ((dayIdx - todayDay + 7) % 7) || 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntil);
  return next.toISOString().split("T")[0];
}

const TimeRangeSlider: React.FC<{
  startSlot: number;
  endSlot: number;
  onStartChange: (v: number) => void;
  onEndChange: (v: number) => void;
}> = ({ startSlot, endSlot, onStartChange, onEndChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const getSlot = (clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * 48);
  };

  const makeHandlers = (which: "start" | "end") => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!(e.currentTarget as HTMLDivElement).hasPointerCapture(e.pointerId)) return;
      const slot = getSlot(e.clientX);
      if (which === "start" && slot >= 0 && slot < endSlot) onStartChange(slot);
      else if (which === "end" && slot > startSlot && slot <= 48) onEndChange(slot);
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    },
  });

  const startPct = (startSlot / 48) * 100;
  const endPct = (endSlot / 48) * 100;

  return (
    <div ref={trackRef} className="relative h-8 select-none px-2.5">
      <div className="absolute top-1/2 left-2.5 right-2.5 -translate-y-1/2 h-2 bg-gray-200 rounded-full">
        <div
          className="absolute h-full bg-gradient-to-r from-[#cf3fad] to-pink-400 rounded-full"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />
      </div>
      <div
        {...makeHandlers("start")}
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-[#cf3fad] rounded-full shadow-md cursor-grab active:cursor-grabbing touch-none z-10"
        style={{ left: `calc(${startPct}% + 10px)` }}
      />
      <div
        {...makeHandlers("end")}
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-[#cf3fad] rounded-full shadow-md cursor-grab active:cursor-grabbing touch-none z-10"
        style={{ left: `calc(${endPct}% + 10px)` }}
      />
    </div>
  );
};

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  subjects,
}) => {
  const [subjectId, setSubjectId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startSlot, setStartSlot] = useState(10); // 5:00 AM
  const [endSlot, setEndSlot] = useState(38);     // 7:00 PM
  const [duration1, setDuration1] = useState(false);
  const [duration2, setDuration2] = useState(false);
  const [duration3, setDuration3] = useState(false);
  const [activeDurationSubjectId, setActiveDurationSubjectId] = useState<string | null>(null);
  const durationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSubjectId("");
      setSubjectName("");
      setSelectedDays([]);
      setStartSlot(10);
      setEndSlot(38);
      setDuration1(false);
      setDuration2(false);
      setDuration3(false);
      setActiveDurationSubjectId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (durationRef.current && !durationRef.current.contains(e.target as Node)) {
        setActiveDurationSubjectId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!isOpen) return null;

  const toggleDay = (idx: number) =>
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) { toast.error("Please select a subject"); return; }
    if (selectedDays.length === 0) { toast.error("Please select at least one day"); return; }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const startTime = slotToHHmm(startSlot);
    const endTime = slotToHHmm(endSlot);

    for (const dayIdx of selectedDays) {
      const dateStr = nextDateForDay(dayIdx);
      onSubmit({
        id: crypto.randomUUID(),
        startTime,
        endTime,
        startDate: dateStr,
        endDate: dateStr,
        subject: subjectName,
        subject_id: subjectId,
        timezone,
        duration_1: duration1 ? 1 : 0,
        duration_2: duration2 ? 1 : 0,
        duration_3: duration3 ? 1 : 0,
        day_of_week: dayIdx,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-100 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between bg-slate-800 px-6 py-4 rounded-t-xl">
          <h3 className="text-lg font-semibold text-white">Set Availability</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Subject */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <BookOpen className="w-4 h-4" />
              Subject *
            </label>
            <div className="flex flex-wrap gap-2">
              {(subjects || []).map((obj: any) => {
                const isSelected = subjectId === obj?.subject_id;
                return (
                  <button
                    type="button"
                    key={obj?.subject_id}
                    onClick={() => {
                      setSubjectId(obj?.subject_id ?? "");
                      setSubjectName(obj?.Subjects?.name ?? "");
                      setActiveDurationSubjectId(obj?.subject_id ?? null);
                    }}
                    className={`inline-flex items-center gap-1 border rounded-lg text-xs px-3 py-1.5 transition-all ${
                      isSelected
                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-blue-700 ring-2 ring-blue-200"
                        : "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <span className="font-semibold">{obj?.Subjects?.name}</span>
                    {obj?.Subjects?.code && (
                      <span className="text-[10px] opacity-80">{obj.Subjects.code}</span>
                    )}
                    {obj?.Subjects?.grade && (
                      <span className="text-[10px] opacity-70">· Grade {obj.Subjects.grade}</span>
                    )}
                  </button>
                );
              })}
              {(!subjects || subjects.length === 0) && (
                <p className="text-sm text-gray-500">No subjects available. Add subjects to your profile first.</p>
              )}
            </div>

            {activeDurationSubjectId === subjectId && subjectId && (
              <div className="relative mt-3" ref={durationRef}>
                <div className="absolute z-10 mt-1 w-44 rounded-md border border-gray-200 bg-white p-3 shadow-lg">
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={duration1} onChange={(e) => setDuration1(e.target.checked)} className="h-3.5 w-3.5" />
                    30 Min
                  </label>
                  <label className="mt-2 flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={duration2} onChange={(e) => setDuration2(e.target.checked)} className="h-3.5 w-3.5" />
                    1 Hour
                  </label>
                  <label className="mt-2 flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={duration3} onChange={(e) => setDuration3(e.target.checked)} className="h-3.5 w-3.5" />
                    1.5 Hour
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Day Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Available Days *
            </label>
            <div className="flex gap-2 justify-between">
              {DAYS.map((day) => (
                <button
                  key={day.idx}
                  type="button"
                  title={day.name}
                  onClick={() => toggleDay(day.idx)}
                  className={`w-10 h-10 rounded-full text-sm font-semibold transition-all duration-150 ${
                    selectedDays.includes(day.idx)
                      ? "bg-[#cf3fad] text-white shadow-md scale-110"
                      : "bg-white text-gray-500 border border-gray-200 hover:border-[#cf3fad] hover:text-[#cf3fad]"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range Slider */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Clock className="w-4 h-4" />
              Availability Hours
            </label>
            <div className="flex justify-between text-sm font-semibold text-[#cf3fad] mb-2 px-2.5">
              <span>{slotToLabel(startSlot)}</span>
              <span>{slotToLabel(endSlot)}{endSlot === 48 ? " +1" : ""}</span>
            </div>
            <TimeRangeSlider
              startSlot={startSlot}
              endSlot={endSlot}
              onStartChange={setStartSlot}
              onEndChange={setEndSlot}
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-2.5">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>12 AM</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#cf3fad] text-white rounded-full hover:bg-[#cf3fad]/80 transition-colors text-sm font-medium"
            >
              Save Availability
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
