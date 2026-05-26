import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FullcalenderComponent } from '../../fullcalender/fullcalender.component';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, FullcalenderComponent],
  selector: 'app-doctors-schedule',
  templateUrl: './doctors-schedule.component.html',
  styleUrls: ['./doctors-schedule.component.scss'],
})
export class DoctorsScheduleComponent {}
