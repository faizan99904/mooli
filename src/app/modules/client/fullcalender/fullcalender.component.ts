import { Component, ViewChild } from '@angular/core';
import { Calendar, CalendarOptions } from '@fullcalendar/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid'; // Month view
import timeGridPlugin from '@fullcalendar/timegrid'; // Week/Day views
import interactionPlugin from '@fullcalendar/interaction'; // For click/drag

@Component({
  selector: 'app-fullcalender',
  standalone: true,
  imports: [FullCalendarModule],
  templateUrl: './fullcalender.component.html',
  styleUrls: ['./fullcalender.component.scss']
})
export class FullcalenderComponent {
  currentDate: Date = new Date();
  @ViewChild('calendar') calendar!: { getApi: () => Calendar };
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
    events: [
      {
        title: 'Meeting', start: new Date(), end: new Date(new Date().setDate(13),)
      },
      {
        title: 'Birthday Party',
        start: new Date(new Date().setDate(20)), // Sets to 20th of current month
        // Additional important properties:
        end: new Date(new Date().setDate(21)), // Optional end date (for multi-day events)
        allDay: true, // Marks as all-day event (default: true)
        id: 'event_' + Math.random().toString(36).substr(2, 9), // Unique ID
        color: '#ff9f89', // Background color
        textColor: '#fff', // Text color
        borderColor: '#ff9f89', // Border color
        display: 'auto', // 'auto' | 'block' | 'list-item' | 'background' | 'inverse-background'
        editable: true, // Allow dragging/resizing
        startEditable: true, // Allow dragging
        durationEditable: true, // Allow resizing
        overlap: true, // Whether other events can overlap this one
        extendedProps: {
          // Custom properties:
          description: 'John\'s 30th birthday celebration',
          location: 'Backyard Garden',
          guests: 25,
          organizer: 'Jane Doe'
        }
      }
    ],

    editable: true,
    selectable: true,
    dayMaxEvents: true
  };
}