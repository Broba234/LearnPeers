"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Clock, Repeat, X, Check } from "lucide-react";
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
  defaultDays?: number[];
  subjects?: any[];
}

// Mon-first ordering: matches how students read a school timetable.
const DAYS = [
  { label: "Mon", short: "M", idx: 1 },
  { label: "Tue", short: "T", idx: 2 },
  { label: "Wed", short: "W", idx: 3 },
  { label: "Thu", short: "T", idx: 4 },
  { label: "Fri", short: "F", idx: 5 },
  { label: "Sat", short: "S", idx: 6 },
  { label: "Sun", short: "S", idx: 0 },
];

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [6, 0];

// Half-hour options from 6:00 AM to 11:00 PM — covers after-school and evening
// tutoring without exposing odd overnight hours.
function buildTimeOptions(startHour = 6, endHour = 23): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (const m of [0, 30]) {
      if (h === endHour && m > 0) break;
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const period = h < 12 ? "AM" : "PM";
      const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${displayH}:${String(m).padStart(2, "0")} ${period}`;
      out.push({ value, label });
    }
  }
  return out;
}

const TIME_OPTIONS = buildTimeOptions();

function labelFor(value: string): string {
  return TIME_OPTIONS.find((t) => t.value === value)?.label ?? value;
}

function toMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

// Availability window: 6:00 AM–11:00 PM in 30-min steps. The dual-handle slider
// maps each handle to a step index so a tutor can drag both ends to set a slot.
const SLOT_MIN = 360; // 6:00 AM, in minutes
const SLOT_MAX = 1380; // 11:00 PM
const SLOT_STEP = 30;
const SLOT_STEPS = (SLOT_MAX - SLOT_MIN) / SLOT_STEP; // 34

function minutesToValue(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function idxToValue(idx: number): string {
  return minutesToValue(SLOT_MIN + idx * SLOT_STEP);
}
function valueToIdx(value: string): number {
  return Math.round((toMinutes(value) - SLOT_MIN) / SLOT_STEP);
}

function nextDateForDay(dayIdx: number): string {
  const today = new Date();
  const todayDay = today.getDay();
  const daysUntil = ((dayIdx - todayDay + 7) % 7) || 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntil);
  return next.toISOString().split("T")[0];
}

function daysSummary(days: number[]): string {
  if (days.length === 0) return "";
  const set = new Set(days);
  const isWeekdays = WEEKDAYS.every((d) => set.has(d)) && days.length === 5;
  const isWeekend = WEEKEND.every((d) => set.has(d)) && days.length === 2;
  const isEveryDay = days.length === 7;
  if (isEveryDay) return "every day";
  if (isWeekdays) return "every weekday";
  if (isWeekend) return "every weekend";
  const ordered = DAYS.filter((d) => set.has(d.idx)).map((d) => d.label);
  return ordered.join(", ");
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultDays,
  subjects,
}) => {
  const [subjectId, setSubjectId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("16:00"); // 4:00 PM
  const [endTime, setEndTime] = useState("19:00"); // 7:00 PM
  const [durations, setDurations] = useState<Record<1 | 2 | 3, boolean>>({
    1: false,
    2: true, // default to a 1-hour session
    3: false,
  });

  useEffect(() => {
    if (isOpen) {
      // Seed the day picker when opened from a specific day's "+".
      setSelectedDays(defaultDays ?? []);
    } else {
      setSubjectId("");
      setSubjectName("");
      setSelectedDays([]);
      setStartTime("16:00");
      setEndTime("19:00");
      setDurations({ 1: false, 2: true, 3: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleDay = (idx: number) =>
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );

  const setPresetDays = (preset: number[]) => {
    const set = new Set(selectedDays);
    const allSelected = preset.every((d) => set.has(d));
    setSelectedDays((prev) =>
      allSelected
        ? prev.filter((d) => !preset.includes(d))
        : Array.from(new Set([...prev, ...preset]))
    );
  };

  const toggleDuration = (key: 1 | 2 | 3) =>
    setDurations((prev) => ({ ...prev, [key]: !prev[key] }));

  const startMin = toMinutes(startTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      toast.error("Pick a subject first");
      return;
    }
    if (selectedDays.length === 0) {
      toast.error("Choose at least one day you're free");
      return;
    }
    if (toMinutes(endTime) <= startMin) {
      toast.error("End time must be after the start time");
      return;
    }
    if (!durations[1] && !durations[2] && !durations[3]) {
      toast.error("Pick at least one session length");
      return;
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

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
        duration_1: durations[1] ? 1 : 0,
        duration_2: durations[2] ? 1 : 0,
        duration_3: durations[3] ? 1 : 0,
        day_of_week: dayIdx,
      });
    }

    toast.success("Weekly availability added");
    onClose();
  };

  const summary =
    selectedDays.length > 0
      ? `${daysSummary(selectedDays)}, ${labelFor(startTime)}–${labelFor(endTime)}`
      : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-800 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Add weekly availability</h3>
            <p className="flex items-center gap-1.5 text-xs text-slate-300 mt-0.5">
              <Repeat className="w-3.5 h-3.5" />
              Set it once — these hours repeat every week
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* Step 1 — Subject */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">1</span>
              <BookOpen className="w-4 h-4" />
              Which subject?
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
                    }}
                    className={`inline-flex items-center gap-1 border rounded-lg text-xs px-3 py-1.5 transition-all ${
                      isSelected
                        ? "bg-[#0077be] text-white border-[#0077be] ring-2 ring-brand-200"
                        : "bg-white border-gray-200 hover:border-brand-300 hover:bg-brand-50"
                    }`}
                  >
                    <span className="font-semibold">{obj?.Subjects?.name}</span>
                    {obj?.Subjects?.grade && (
                      <span className="text-[10px] opacity-70">· Grade {obj.Subjects.grade}</span>
                    )}
                  </button>
                );
              })}
              {(!subjects || subjects.length === 0) && (
                <p className="text-sm text-gray-500">
                  No subjects yet. Add subjects to your profile first.
                </p>
              )}
            </div>
          </div>

          {/* Step 2 — Days */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">2</span>
              Which days are you free?
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              <PresetChip label="Weekdays" onClick={() => setPresetDays(WEEKDAYS)} />
              <PresetChip label="Weekend" onClick={() => setPresetDays(WEEKEND)} />
              <PresetChip label="Every day" onClick={() => setPresetDays([1, 2, 3, 4, 5, 6, 0])} />
            </div>
            <div className="flex gap-2 justify-between">
              {DAYS.map((day) => {
                const active = selectedDays.includes(day.idx);
                return (
                  <button
                    key={day.idx}
                    type="button"
                    title={day.label}
                    onClick={() => toggleDay(day.idx)}
                    className={`flex-1 h-11 rounded-lg text-sm font-semibold transition-all duration-150 ${
                      active
                        ? "bg-[#0077be] text-white shadow-md"
                        : "bg-white text-gray-500 border border-gray-200 hover:border-[#0077be] hover:text-[#0077be]"
                    }`}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3 — Hours */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">3</span>
              <Clock className="w-4 h-4" />
              What hours?
            </label>
            <TimeRangeSlider
              startTime={startTime}
              endTime={endTime}
              onChange={(s, e) => {
                setStartTime(s);
                setEndTime(e);
              }}
            />
          </div>

          {/* Step 4 — Session length */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">4</span>
              Session lengths you offer
            </label>
            <div className="flex gap-2">
              {([
                { key: 2 as const, label: "1 hour" },
                { key: 1 as const, label: "30 min" },
                { key: 3 as const, label: "1.5 hours" },
              ]).map((d) => {
                const active = durations[d.key];
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => toggleDuration(d.key)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? "bg-brand-50 border-[#0077be] text-[#0077be]"
                        : "bg-white border-gray-200 text-gray-500 hover:border-brand-300"
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live summary */}
          {summary && (
            <div className="flex items-start gap-2 rounded-lg bg-brand-50 border border-brand-100 px-4 py-3 text-sm text-slate-700">
              <Repeat className="w-4 h-4 text-[#0077be] mt-0.5 shrink-0" />
              <span>
                You'll be available for{" "}
                <span className="font-semibold">{subjectName || "this subject"}</span>{" "}
                <span className="font-semibold">{summary}</span>, every week.
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#0077be] text-white rounded-full hover:bg-[#0077be]/90 transition-colors text-sm font-medium"
            >
              Save weekly availability
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PresetChip: React.FC<{ label: string; active?: boolean; onClick: () => void }> = ({
  label,
  active,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
      active
        ? "bg-[#0077be] text-white border-[#0077be]"
        : "bg-white border-gray-200 text-gray-600 hover:border-[#0077be] hover:text-[#0077be]"
    }`}
  >
    {label}
  </button>
);

// Dual-handle range slider for the availability window. Two overlaid range
// inputs (both ends draggable); a min one-step gap keeps start before end.
const TimeRangeSlider: React.FC<{
  startTime: string;
  endTime: string;
  onChange: (start: string, end: string) => void;
}> = ({ startTime, endTime, onChange }) => {
  const startIdx = valueToIdx(startTime);
  const endIdx = valueToIdx(endTime);
  const leftPct = (startIdx / SLOT_STEPS) * 100;
  const rightPct = (endIdx / SLOT_STEPS) * 100;

  const setStart = (idx: number) =>
    onChange(idxToValue(Math.min(Math.max(0, idx), endIdx - 1)), endTime);
  const setEnd = (idx: number) =>
    onChange(startTime, idxToValue(Math.max(Math.min(SLOT_STEPS, idx), startIdx + 1)));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-semibold text-[#0077be]">{labelFor(startTime)}</span>
        <span className="text-xs text-gray-400">to</span>
        <span className="font-semibold text-[#0077be]">{labelFor(endTime)}</span>
      </div>
      <div className="dual-range relative flex h-6 items-center">
        <div className="absolute h-1.5 w-full rounded-full bg-gray-200" />
        <div
          className="absolute h-1.5 rounded-full bg-[#0077be]"
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />
        <input
          type="range"
          min={0}
          max={SLOT_STEPS}
          step={1}
          value={startIdx}
          onChange={(e) => setStart(Number(e.target.value))}
          aria-label="Start time"
        />
        <input
          type="range"
          min={0}
          max={SLOT_STEPS}
          step={1}
          value={endIdx}
          onChange={(e) => setEnd(Number(e.target.value))}
          aria-label="End time"
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-gray-400">
        <span>6 AM</span>
        <span>11 PM</span>
      </div>
    </div>
  );
};
