import { Component, OnInit, ViewChild } from '@angular/core';
import { Calendar, CalendarOptions, DatesSetArg, EventInput } from '@fullcalendar/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid'; // Month view
import timeGridPlugin from '@fullcalendar/timegrid'; // Week/Day views
import interactionPlugin from '@fullcalendar/interaction'; // For click/drag
import { BackendService } from '../../../core/services/backend.service';
import { Appointment } from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-fullcalender',
  standalone: true,
  imports: [FullCalendarModule],
  templateUrl: './fullcalender.component.html',
  styleUrls: ['./fullcalender.component.scss']
})
export class FullcalenderComponent implements OnInit {
  currentDate: Date = new Date();
  @ViewChild('calendar') calendar!: { getApi: () => Calendar };

  constructor(private backend: BackendService) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  changeDate(days: number): void {
    const newDate = new Date(this.currentDate);
    newDate.setDate(newDate.getDate() + days);
    this.currentDate = newDate;
    this.calendarApi.gotoDate(this.currentDate);
  }
  get calendarApi(): Calendar {
    return this.calendar.getApi();
  }

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth', // Default view
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay' // 3 view buttons
    },
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    events: [],

    editable: true,
    selectable: true,
    dayMaxEvents: true,
    datesSet: (arg) => this.onDatesSet(arg),
  };

  onDatesSet(arg: DatesSetArg): void {
    this.loadAppointments(arg.startStr.slice(0, 10), arg.endStr.slice(0, 10));
  }

  loadAppointments(dateFrom?: string, dateTo?: string): void {
    const monthStart = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const monthEnd = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);

    this.backend
      .getAppointmentCalendar({
        dateFrom: dateFrom || monthStart.toISOString().slice(0, 10),
        dateTo: dateTo || monthEnd.toISOString().slice(0, 10),
      })
      .subscribe({
        next: (appointments) => {
          this.calendarOptions = {
            ...this.calendarOptions,
            events: appointments.map((appointment) => this.toEventInput(appointment)),
          };
        },
        error: () => {
          this.calendarOptions = {
            ...this.calendarOptions,
            events: [],
          };
        },
      });
  }

  toEventInput(appointment: Appointment): EventInput {
    const day = appointment.appointmentDate.slice(0, 10);
    const patientName = appointment.patient
      ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
      : 'Patient';
    const doctorName = appointment.doctor?.name || 'Doctor';

    return {
      id: appointment._id,
      title: `${patientName} with ${doctorName}`,
      start: `${day}T${appointment.startTime}:00`,
      end: `${day}T${appointment.endTime}:00`,
      color: appointment.status === 'completed' ? '#28a745' : '#17a2b8',
      extendedProps: {
        status: appointment.status,
        reason: appointment.reason,
      },
    };
  }
}
