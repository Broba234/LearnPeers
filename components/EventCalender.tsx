import React, { useState, useCallback, useMemo } from "react";
import moment from "moment";
import { EventDetailModal } from "./EventDetailModal";
import { EventModal, EventFormData } from "./EventModal";
import { Plus, Repeat, Clock, CalendarDays, BookOpen } from "lucide-react";

interface CalendarEvent {
  id: string;
  subject: string;
  startDate: any;
  endDate: any;
  subject_id: string;
  startTime: any;
  endTime: any;
  timezone: any;
  duration: any;
}

interface SelectableProps {
  // Kept for backwards compat with the page (no longer used internally).
  localizer?: any;
  email: string;
  id: string;
  data?: any[];
  subjects?: any[];
}

// Mon-first, the way a student reads a school timetable.
const DAYS = [
  { label: "Monday", short: "Mon", idx: 1 },
  { label: "Tuesday", short: "Tue", idx: 2 },
  { label: "Wednesday", short: "Wed", idx: 3 },
  { label: "Thursday", short: "Thu", idx: 4 },
  { label: "Friday", short: "Fri", idx: 5 },
  { label: "Saturday", short: "Sat", idx: 6 },
  { label: "Sunday", short: "Sun", idx: 0 },
];

// Compact wall-clock label: "4 PM", "4:30 PM".
function fmtTime(m: moment.Moment): string {
  return m.minutes() === 0 ? m.format("h A") : m.format("h:mm A");
}

function durationChips(slot: any): string[] {
  const out: string[] = [];
  if (slot?.duration_1) out.push("30m");
  if (slot?.duration_2) out.push("1h");
  if (slot?.duration_3) out.push("1.5h");
  return out;
}

// Turn a stored recurring slot into the event shape the detail modal expects.
function toEvent(slot: any) {
  const start = moment.utc(slot.start_date).local();
  const end = moment.utc(slot.end_date).local();
  return {
    id: slot.id,
    title: slot.subject || "Available",
    price: slot.price?.toString() || "0",
    start: start.toDate(),
    end: end.toDate(),
    start_time: start,
    end_time: end,
    recurring: true,
    originalData: slot,
  };
}

export default function Selectable({ email, id, data, subjects }: SelectableProps) {
  const [slots, setSlots] = useState<any[]>(data || []);

  const [modalOpen, setModalOpen] = useState(false);
  const [createDays, setCreateDays] = useState<number[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Re-pull availability after create / edit / delete to stay in sync.
  const refreshEvents = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/tutor-availability/get?email=${encodeURIComponent(email)}`
      );
      if (res.ok) setSlots(await res.json());
    } catch {
      /* keep current slots on failure */
    }
  }, [email]);

  const handleCreateEvent = useCallback(
    async (formData: EventFormData) => {
      const newEvent = {
        id: formData.id,
        title: formData.subject,
        subject_id: formData.subject_id,
        duration_1: formData.duration_1,
        duration_2: formData.duration_2,
        duration_3: formData.duration_3,
        subject: formData.subject,
        start_time: formData.startTime,
        end_time: formData.endTime,
        startDate: formData.startDate,
        endDate: formData.endDate,
        timezone: formData.timezone,
        day_of_week: formData.day_of_week,
        start: new Date(formData.startDate + "T" + formData.startTime),
        end: new Date(formData.endDate + "T" + formData.endTime),
      };
      try {
        await fetch("/api/tutor-availability/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, newEvent, id }),
        });
      } catch {
        /* surfaced by refresh */
      }
      await refreshEvents();
    },
    [email, id, refreshEvents]
  );

  const openCreate = (day?: number) => {
    setCreateDays(day !== undefined ? [day] : []);
    setModalOpen(true);
  };

  const handleEventSelect = (event: any) => {
    // Normalize to the stored record id for edit / delete.
    const recordId = event?.originalData?.id ?? event?.id;
    setSelectedEvent({ ...event, id: recordId });
    setIsDetailModalOpen(true);
  };

  // Group slots by weekday for the board.
  const byDay = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const slot of slots) {
      if (!slot?.start_date || !slot?.end_date) continue;
      const day =
        typeof slot.day_of_week === "number"
          ? slot.day_of_week
          : moment.utc(slot.start_date).local().day();
      const arr = map.get(day) || [];
      arr.push(slot);
      map.set(day, arr);
    }
    // Sort each day's slots by start time.
    for (const [, arr] of map) {
      arr.sort(
        (a, b) =>
          moment.utc(a.start_date).valueOf() - moment.utc(b.start_date).valueOf()
      );
    }
    return map;
  }, [slots]);

  // Headline stats.
  const stats = useMemo(() => {
    let minutes = 0;
    const subjectSet = new Set<string>();
    const daySet = new Set<number>();
    for (const slot of slots) {
      if (!slot?.start_date || !slot?.end_date) continue;
      minutes += moment
        .utc(slot.end_date)
        .diff(moment.utc(slot.start_date), "minutes");
      if (slot.subject) subjectSet.add(slot.subject);
      const day =
        typeof slot.day_of_week === "number"
          ? slot.day_of_week
          : moment.utc(slot.start_date).local().day();
      daySet.add(day);
    }
    const hours = minutes / 60;
    return {
      hours: Number.isInteger(hours) ? `${hours}` : hours.toFixed(1),
      days: daySet.size,
      subjects: subjectSet.size,
    };
  }, [slots]);

  const todayDay = new Date().getDay();
  const hasAny = slots.length > 0;

  return (
    <div className="min-h-screen bg-canvas p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 md:p-8 shadow-brand">
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Your weekly availability
              </h1>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-brand-50/90">
                <Repeat className="h-4 w-4" />
                Set your hours once — they repeat automatically every week.
              </p>
            </div>
            <button
              onClick={() => openCreate()}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition-colors hover:bg-brand-50"
            >
              <Plus className="h-4 w-4" />
              Add availability
            </button>
          </div>

          {hasAny && (
            <div className="relative mt-6 grid grid-cols-3 gap-3">
              <Stat icon={<Clock className="h-4 w-4" />} value={stats.hours} label="hrs / week" />
              <Stat icon={<CalendarDays className="h-4 w-4" />} value={`${stats.days}`} label={stats.days === 1 ? "day active" : "days active"} />
              <Stat icon={<BookOpen className="h-4 w-4" />} value={`${stats.subjects}`} label={stats.subjects === 1 ? "subject" : "subjects"} />
            </div>
          )}
        </div>

        {/* Week board */}
        {hasAny ? (
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-sm">
            {DAYS.map((day, i) => {
              const daySlots = byDay.get(day.idx) || [];
              const isToday = day.idx === todayDay;
              return (
                <div
                  key={day.idx}
                  className={`group flex items-center gap-3 px-4 py-3.5 transition-colors md:px-6 ${
                    i !== 0 ? "border-t border-ink-100" : ""
                  } ${isToday ? "bg-brand-50/40" : "hover:bg-muted/50"}`}
                >
                  {/* Day label */}
                  <div className="flex w-24 shrink-0 flex-col">
                    <span className="text-sm font-semibold text-ink-800">{day.short}</span>
                    {isToday && (
                      <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Slots */}
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    {daySlots.length > 0 ? (
                      daySlots.map((slot) => {
                        const ev = toEvent(slot);
                        const chips = durationChips(slot);
                        return (
                          <button
                            key={slot.id}
                            onClick={() => handleEventSelect(ev)}
                            className="group/pill inline-flex items-center gap-2.5 rounded-xl border border-brand-100 bg-brand-50 py-1.5 pl-2 pr-3 text-left transition-all hover:border-brand-300 hover:shadow-sm"
                          >
                            <span className="h-7 w-1 rounded-full bg-gradient-to-b from-brand-500 to-brand-700" />
                            <span>
                              <span className="block text-sm font-semibold text-ink-800">
                                {fmtTime(ev.start_time)} – {fmtTime(ev.end_time)}
                              </span>
                              <span className="flex items-center gap-1.5 text-xs text-ink-500">
                                <span className="truncate max-w-[10rem]">{slot.subject || "Available"}</span>
                                {chips.length > 0 && (
                                  <span className="text-ink-300">·</span>
                                )}
                                {chips.map((c) => (
                                  <span key={c} className="rounded bg-white px-1 text-[10px] font-medium text-brand-700">
                                    {c}
                                  </span>
                                ))}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <button
                        onClick={() => openCreate(day.idx)}
                        className="text-sm text-ink-300 transition-colors hover:text-brand-600"
                      >
                        Not available
                      </button>
                    )}
                  </div>

                  {/* Add to this day */}
                  <button
                    onClick={() => openCreate(day.idx)}
                    title={`Add availability on ${day.label}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-400 opacity-0 transition-all hover:bg-brand-50 hover:text-brand-600 focus:opacity-100 group-hover:opacity-100"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          // Empty state
          <div className="rounded-2xl border border-dashed border-brand-200 bg-surface p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
              <CalendarDays className="h-7 w-7 text-brand-600" />
            </div>
            <h2 className="text-lg font-semibold text-ink-800">No availability set yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
              Add the hours you're free each week. Students can only book the times you
              set here — and they repeat every week automatically.
            </p>
            <button
              onClick={() => openCreate()}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-brand transition-colors hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" />
              Add your first slot
            </button>
          </div>
        )}
      </div>

      <EventModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setCreateDays([]);
        }}
        onSubmit={handleCreateEvent}
        defaultStart={new Date()}
        defaultEnd={new Date(Date.now() + 60 * 60 * 1000)}
        defaultDays={createDays}
        subjects={subjects}
      />

      <EventDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        event={selectedEvent}
        onDelete={() => {
          setIsDetailModalOpen(false);
          refreshEvents();
        }}
        onUpdate={() => {
          setIsDetailModalOpen(false);
          refreshEvents();
        }}
      />
    </div>
  );
}

const Stat: React.FC<{ icon: React.ReactNode; value: string; label: string }> = ({
  icon,
  value,
  label,
}) => (
  <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
    <div className="flex items-center gap-1.5 text-brand-50/80">{icon}</div>
    <div className="mt-1 text-xl font-bold leading-none text-white md:text-2xl">{value}</div>
    <div className="mt-1 text-xs text-brand-50/70">{label}</div>
  </div>
);
