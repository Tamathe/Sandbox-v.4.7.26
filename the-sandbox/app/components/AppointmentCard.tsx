'use client'

import { GraduationCap, Mail, Phone, MapPin, CalendarDays, Clock } from 'lucide-react'
import type { CollegeAdvisorContact } from '../lib/student-services'

interface AppointmentCardProps {
  contact: CollegeAdvisorContact
}

export default function AppointmentCard({ contact }: AppointmentCardProps) {
  return (
    <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white">
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap className="size-5 text-[#0033A0]" />
        <h3 className="font-bold text-gray-900">Your College Advisor</h3>
      </div>
      {contact.collegeName && (
        <p className="font-semibold text-gray-900 text-sm">{contact.collegeName}</p>
      )}
      {contact.officeName && (
        <p className="text-gray-500 text-xs mt-0.5">{contact.officeName}</p>
      )}
      <div className="mt-4 space-y-2 text-sm">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-2 text-[#0033A0] hover:underline"
          >
            <Mail className="size-4 shrink-0" />
            {contact.email}
          </a>
        )}
        {contact.phone && (
          <p className="flex items-center gap-2 text-gray-700">
            <Phone className="size-4 shrink-0" />
            {contact.phone}
          </p>
        )}
        {contact.location && (
          <p className="flex items-center gap-2 text-gray-700">
            <MapPin className="size-4 shrink-0" />
            {contact.location}
          </p>
        )}
        {contact.walkInHours && (
          <p className="flex items-center gap-2 text-gray-700">
            <Clock className="size-4 shrink-0" />
            {contact.walkInHours}
          </p>
        )}
        {contact.appointmentUrl && (
          <a
            href={contact.appointmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 w-full bg-[#0033A0] text-white rounded-xl py-2 font-semibold text-sm hover:bg-[#002280] transition-colors"
          >
            <CalendarDays className="size-4" />
            Schedule Appointment
          </a>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-4">
        For official decisions, your college advisor is the final word.
      </p>
    </div>
  )
}
