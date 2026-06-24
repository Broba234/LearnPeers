import React, { useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  Calendar,
  Views,
  DateLocalizer,
  momentLocalizer,
  View,
  Components,
} from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { EventDetailModal } from "./EventDetailModal";
import { EventModal, EventFormData } from "./EventModal";
import { PlusIcon, Repeat } from "lucide-react";

// Define TypeScript interfaces
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
  localizer?: DateLocalizer;
  email: string;
  id: string;
  data?: CalendarEvent[];
  subjects?: any[];
}

interface SlotInfo {
  start: Date;
  end: Date;
  slots: Date[];
  action: "select" | "click" | "doubleClick";
}

// Set up moment localizer
const localizer = momentLocalizer(moment);

// Custom Event Components
interface CustomEventProps {
  event: any;
  view?: View;
}

const CustomEvent: React.FC<CustomEventProps> = ({ event, view }) => {
  const startTime = moment(event.start_time).format("h:mm A");
  const endTime = moment(event.end_time).format("h:mm A");
  const dateStr = moment(event.start_date).format("MMM D, YYYY");

  if (view === Views.MONTH) {
    return (
      <div className={` text-white p-1 rounded text-xs overflow-hidden`}>
        <div className="flex items-center gap-1 mb-0.5">
          <div className="font-bold truncate">
            {event?.originalData?.subject || event?.title}
          </div>
        </div>
      </div>
    );
  }

  if (view === Views.AGENDA) {
    return (
      <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-brand-500 mb-2">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-bold text-gray-800">
              {event?.originalData?.subject || event?.title}
            </div>
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-700">
          <div className="flex items-center gap-1 mt-1">
            <span>🕐</span> {dateStr} • {startTime} - {endTime}
          </div>
          {event.price && (
            <div className="mt-2 text-xs text-gray-600">{event.price}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={` text-white p-2 rounded-md h-full overflow-hidden`}>
      <div className="font-bold text-sm mb-1 truncate">
        {event?.originalData?.subject || event?.title}
      </div>
      <div className="text-xs opacity-90 mb-0.5 flex items-center gap-1">
        <span className="text-[10px]">🕐</span> {startTime} - {endTime}
      </div>
    </div>
  );
};

// Main component
export default function Selectable({
  localizer: propLocalizer,
  email,
  id,
  data,
  subjects,
}: SelectableProps) {
  // Availability is a *weekly recurring* rule (day_of_week + start/end time),
  // so each stored slot is expanded into one calendar event per week across a
  // window around today. This makes the schedule visibly repeat every week.
  const RECURRENCE_WEEKS_BACK = 2;
  const RECURRENCE_WEEKS_AHEAD = 26;

  const transformEvents = (eventsData: any[]): any[] => {
    return eventsData.flatMap((event) => {
      if (!event?.start_date || !event?.end_date) return [];

      const baseStart = moment.utc(event.start_date).local();
      const baseEnd = moment.utc(event.end_date).local();
      const durationMs = baseEnd.diff(baseStart);

      // Walk weekly forward/back from the slot's own week so we cover the
      // visible range regardless of when the slot was originally created.
      const events: any[] = [];
      for (let wk = -RECURRENCE_WEEKS_BACK; wk <= RECURRENCE_WEEKS_AHEAD; wk++) {
        const start = baseStart.clone().add(wk, "weeks");
        const end = start.clone().add(durationMs, "milliseconds");
        events.push({
          id: wk === 0 ? event.id : `${event.id}__wk${wk}`,
          title: event.subject || "Available Slot",
          price: event.price?.toString() || "0",
          start: start.toDate(),
          end: end.toDate(),
          start_time: start,
          end_time: end,
          allDay: false,
          recurring: true,
          originalData: event,
        });
      }
      return events;
    });
  };

  const [myEvents, setEvents] = useState<any[]>(transformEvents(data || []));
  const [subjectsData, setSubjectsData] = useState<any[]>(subjects || []);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  // Week view is the right default for a *recurring weekly* schedule — it reads
  // like a student's class timetable instead of a noisy month of repeats.
  const [currentView, setCurrentView] = useState<View>(Views.WEEK);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );

  // const handleDeleteEvent = useCallback((eventId: string) => {
  //   setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
  // }, []);

  // Re-pull availability from the server and re-expand it into weekly
  // occurrences. Used after create / edit / delete to keep the calendar in sync.
  const refreshEvents = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/tutor-availability/get?email=${encodeURIComponent(email)}`
      );
      if (res.ok) {
        const data = await res.json();
        setEvents(transformEvents(data));
      }
    } catch (e) {
      // keep current events on failure
    }
  }, [email]);

  const handleCreateEvent = useCallback(async (formData: EventFormData) => {
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
      // setSaving(true);
      // const slots = buildIntervals();
      const res = await fetch("/api/tutor-availability/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newEvent, id }),
      });
      if (!res.ok) {
        console.error("Error saving availability", res);
      }
      // setMessage('Availability saved');
      // setTimeout(() => setMessage(''), 2500);
    } catch (e: any) {
      // setMessage('Error saving availability');
      // setTimeout(() => setMessage(''), 3500);
    } finally {
      // setSaving(false);
    }
    await refreshEvents();
  }, [email, id, refreshEvents]);

  const handleViewChange = useCallback((view: View) => {
    setCurrentView(view);
  }, []);

  const handleNavigate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleEventSelect = (event: any) => {
    // Occurrences of a recurring slot carry a synthetic id (`<id>__wk<n>`);
    // edit/delete must act on the real underlying record, so normalize the id
    // to the stored record id while keeping the clicked occurrence's date/time.
    const recordId = event?.originalData?.id ?? event?.id;
    setSelectedEvent({ ...event, id: recordId });
    setIsDetailModalOpen(true);
  };

  const handleEventUpdate = async (_eventId: string, _updatedData: any) => {
    // The edit hit the server; re-expand the rule into weekly occurrences.
    await refreshEvents();
  };

  const handleEventDelete = (_eventId: string) => {
    // The delete hit the server; drop all weekly occurrences of the rule.
    refreshEvents();
  };

  // Custom components for different views
  const components: Components<any> = useMemo(
    () => ({
      event: (props) => <CustomEvent event={props.event} view={currentView} />,
    }),
    [currentView]
  );

  // Custom event style for background color
  const eventStyleGetter = useCallback((event: any) => {
    const backgroundColor = "green";

    return {
      style: {
        backgroundColor,
        opacity: 0.95,
        color: "white",
        border: "none",
        display: "block",
        padding: "2px",
        overflow: "hidden",
      },
    };
  }, []);

  // Open the week/day view scrolled to the morning so after-school hours are in view.
  const scrollToTime = useMemo(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  }, []);

  // Count distinct weekly slots (not the weekly occurrences we expand them into),
  // so the header reflects "how many recurring blocks have I set".
  const weeklySlotCount = useMemo(
    () => new Set(myEvents.map((e) => e.originalData?.id ?? e.id)).size,
    [myEvents]
  );
  const handleAddLectureClick = useCallback(() => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    setSelectedSlot({ start: now, end: oneHourLater });
    setModalOpen(true);
  }, []);

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 bg-white flex items-start justify-between rounded-lg shadow p-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">
                Your weekly availability
              </h1>
              <p className="flex items-center gap-1.5 text-gray-600 mb-4">
                <Repeat className="w-4 h-4 text-[#0077be]" />
                Set the hours you tutor — they repeat automatically every week.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  <span className="text-sm text-gray-600">Available hours</span>
                </div>
                <span className="text-gray-300">•</span>
                <p className="text-sm text-gray-700">
                  <span className="font-bold">{weeklySlotCount}</span>{" "}
                  weekly {weeklySlotCount === 1 ? "slot" : "slots"} set
                </p>
              </div>
            </div>

            <button
              onClick={handleAddLectureClick}
              className="px-5 py-2.5 bg-[#0077be] text-white rounded-full hover:bg-[#0077be]/80 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
            >
              <span><PlusIcon className="w-4 h-4" /></span>
              Add availability
            </button>
          </div>

          {weeklySlotCount === 0 && (
            <div className="mb-6 rounded-lg border border-dashed border-brand-200 bg-brand-50/50 p-6 text-center">
              <p className="text-gray-700 font-medium">No availability set yet.</p>
              <p className="text-sm text-gray-500 mt-1">
                Add the hours you're free each week — students can only book the times you set here.
              </p>
              <button
                onClick={handleAddLectureClick}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#0077be] text-white rounded-full text-sm hover:bg-[#0077be]/90 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add your first slot
              </button>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="h-[700px]">
              <Calendar
                date={currentDate}
                view={currentView}
                onView={handleViewChange}
                onNavigate={handleNavigate}
                events={myEvents}
                localizer={propLocalizer || localizer}
                onSelectEvent={handleEventSelect}
                selectable={false}
                views={[Views.WEEK, Views.DAY]}
                scrollToTime={scrollToTime}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
                components={components}
                eventPropGetter={eventStyleGetter}
                popup
                formats={{
                  timeGutterFormat: "h:mm A",
                  eventTimeRangeFormat: ({ start, end }) =>
                    `${moment(start).format("h:mm A")} - ${moment(end).format(
                      "h:mm A"
                    )}`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <EventModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedSlot(null);
        }}
        onSubmit={handleCreateEvent}
        defaultStart={selectedSlot?.start || new Date()}
        defaultEnd={selectedSlot?.end || new Date(Date.now() + 60 * 60 * 1000)}
        subjects={subjects}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        event={selectedEvent}
        onDelete={handleEventDelete}
        onUpdate={handleEventUpdate}
      />
    </>
  );
}

Selectable.propTypes = {
  localizer: PropTypes.instanceOf(DateLocalizer),
};
