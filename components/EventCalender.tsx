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
import { PlusIcon } from "lucide-react";

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
  const transformEvents = (eventsData: any[]): any[] => {
    return eventsData.map((event) => {
      if (event.start_date && event.end_date) {
        const start = moment.utc(event.start_date).local();
        const end = moment.utc(event.end_date).local();
        return {
          id: event.id,
          title: event.subject || "Available Slot",
          price: event.price?.toString() || "0",
          start: start.toDate(), // Convert to Date object
          end: end.toDate(),
          start_time: start, // Optional: store formatted time
          end_time: end,
          allDay: false,
          originalData: event,
        };
      }
    });
  };

  const [myEvents, setEvents] = useState<any[]>(transformEvents(data || []));
  const [subjectsData, setSubjectsData] = useState<any[]>(subjects || []);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );

  // const handleDeleteEvent = useCallback((eventId: string) => {
  //   setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
  // }, []);

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
    try {
      const res = await fetch(`/api/tutor-availability/get?email=${encodeURIComponent(email)}`);
      
      if (res.ok) {
        const data = await res.json();
        console.log('data updated', data);
        setEvents(transformEvents(data));
      }
    } catch (e) {
    } finally {
    }
  }, []);

  const handleViewChange = useCallback((view: View) => {
    setCurrentView(view);
  }, []);

  const handleNavigate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleEventSelect = (event: any) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };

  const handleEventUpdate = async (eventId: string, updatedData: any) => {
    setEvents((prev) => prev.map((e) => (e.id === eventId ? updatedData : e)));
  };

  const handleEventDelete = (eventId: string) => {
    // Remove event from state
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
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

  const { scrollToTime } = useMemo(
    () => ({
      scrollToTime: new Date(),
    }),
    []
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
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Availability Calendar
              </h1>
              <p className="text-gray-600 mb-4">
                Schedule and manage your availability
              </p>

              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-brand-600"></div>
                  <span className="text-sm">Lecture</span>
                </div>
              </div>
              <p className="text-gray-700">
                Total Events:{" "}
                <span className="font-bold">{myEvents.length}</span>
              </p>
            </div>

            <button
              onClick={handleAddLectureClick}
              className="px-5 py-2.5 bg-[#0077be] text-white rounded-full hover:bg-[#0077be]/80 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
            >
              <span><PlusIcon className="w-4 h-4" /></span>
              Create availability
            </button>
          </div>

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
