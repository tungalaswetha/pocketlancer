"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";

interface Booking {
  _id: string;
  serviceType: string;
  status: string;
  preferredDate: string;
}

export default function FreelancerCalendar({
  bookings,
}: {
  bookings: Booking[];
}) {
  const events = bookings.map((b) => ({
    title: `${b.serviceType} (${b.status})`,
    date: b.preferredDate,
  }));

  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={events}
        height="auto"
      />
    </div>
  );
}
