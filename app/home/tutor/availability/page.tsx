"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import LearnPeersLoader from "@/components/ui/LearnPeersLoader";
import Selectable from "@/components/EventCalender";
import { momentLocalizer } from 'react-big-calendar'
import moment from 'moment-timezone'
type ApiSlot = { dayOfWeek: number; start: string; end: string };

const DAYS = [
  { label: "Mon", idx: 1 },
  { label: "Tue", idx: 2 },
  { label: "Wed", idx: 3 },
  { label: "Thu", idx: 4 },
  { label: "Fri", idx: 5 },
  { label: "Sat", idx: 6 },
  { label: "Sun", idx: 0 },
];

function generateTimes(start = 7, end = 22, stepMinutes = 30) {
  const out: string[] = [];
  for (let h = start; h <= end; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      if (h === end && m > 0) break;
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      out.push(`${hh}:${mm}`);
    }
  }
  return out; // inclusive start, exclusive end in grouping logic
}

const TIMES = generateTimes(7, 22, 30);

function addMinutes(t: string, minutes: number) {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export default function TutorAvailability() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [email, setEmail] = useState<string>('');
  const [id, setId] = useState<string>('');
  // (UI was simplified; week offset removed
  const [subjects, setSubjects] = useState<[]>([]);
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          setLoading(false);
          return;
        }
        setEmail(user.email);
        setId(user.id);
        const res = await fetch(`/api/tutor-availability/get?email=${encodeURIComponent(user.email)}`);
        
        if (res.ok) {
          const data = await res.json();
          setData(data);
        }
        const profileRes = await fetch(
          `/api/subjects/tutor-subjects?email=${encodeURIComponent(
            user.email
          )}`
        );

        if (profileRes.ok) {
          const profileData = await profileRes.json();

          setSubjects(profileData);
        }
      } catch (e) {
        console.error("[TutorAvailability] init failed", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  if (loading) {
    return <LearnPeersLoader fullScreen label="Loading availability…" />;
  }
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
moment.tz.setDefault(userTimezone);

const localizer = momentLocalizer(moment);
  return (
    <>
      <Selectable localizer={localizer} email={email} id={id} data={data} subjects={subjects} />
    </>

  );
}
