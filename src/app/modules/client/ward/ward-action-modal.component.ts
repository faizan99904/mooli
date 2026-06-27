import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WardModuleKey } from './ward-module.models';
import { WardDataService } from './services/ward-data.service';
import { Doctor, Patient, Prescription, Room } from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-ward-action-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './ward-action-modal.component.html',
  styleUrl: './ward-action-modal.component.scss',
})
export class WardActionModalComponent implements OnChanges {
  @Input() open = false;
  @Input() moduleKey!: WardModuleKey;
  @Input() title = 'Action';
  @Input() preset: Record<string, string | number> = {};
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  loading = false;
  saving = false;
  patients: Patient[] = [];
  rooms: Room[] = [];
  doctors: Doctor[] = [];
  prescriptions: Prescription[] = [];

  form: Record<string, string | number> = {
    patientId: '',
    roomId: '',
    doctorId: '',
    consultantDoctorId: '',
    prescriptionId: '',
    title: '',
    description: '',
    notes: '',
    medicineName: '',
    dose: '',
    route: 'PO',
    fluidName: '',
    bloodPressure: '',
    temperature: '',
    pulse: '',
    weight: '',
    intake: '',
    output: '',
    balance: '',
    shift: 'day',
    orderName: '',
    orderType: 'lab',
    priority: 'normal',
    bedNo: '',
    bedType: 'standard',
    dailyCharge: 0,
    admissionReason: '',
    bedLabel: '',
    category: 'Consumable',
    quantity: 0,
    reorderLevel: 5,
    location: 'Ward Store',
    nurseName: '',
    patientsCount: 1,
    pendingCount: 0,
    patientCondition: '',
    pendingMedicines: '',
    pendingLabs: '',
    runningDrips: '',
    specialInstructions: '',
    riskAlerts: '',
    doctorInformed: 'no',
  };

  constructor(private wardData: WardDataService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue) {
      this.resetForm();
      Object.entries(this.preset).forEach(([key, value]) => {
        if (key in this.form) {
          this.form[key] = value;
        }
      });
      this.loadOptions();
    }
  }

  get shiftOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'day', label: 'Day Shift' },
      { value: 'evening', label: 'Evening Shift' },
      { value: 'night', label: 'Night Shift' },
    ];
  }

  patientLabel(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`.trim() + (patient.patientNo ? ` (${patient.patientNo})` : '');
  }

  roomLabel(room: Room): string {
    return `${room.roomNo} · ${room.roomType} · ${room.status}`;
  }

  doctorLabel(doctor: Doctor): string {
    return doctor.user?.name || doctor.specialization || doctor._id;
  }

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    if (!this.moduleKey) {
      return;
    }

    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.saving = true;
    this.wardData.submitModuleAction(this.moduleKey, payload).subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.close();
      },
      error: () => {
        this.saving = false;
      },
    });
  }

  private loadOptions(): void {
    this.loading = true;
    this.wardData.loadActionOptions().subscribe({
      next: (bundle) => {
        const admittedPatients = bundle.allotments
          .filter((allotment) => allotment.status === 'admitted' && allotment.patient)
          .map((allotment) => allotment.patient as Patient);
        this.patients = admittedPatients.length ? admittedPatients : bundle.patients;
        this.rooms = bundle.rooms.filter((room) => room.status === 'available' || room.status === 'occupied');
        this.doctors = bundle.doctors;
        this.prescriptions = bundle.prescriptions;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private resetForm(): void {
    Object.keys(this.form).forEach((key) => {
      if (typeof this.form[key] === 'number') {
        this.form[key] = 0;
      } else {
        this.form[key] = '';
      }
    });
    this.form['shift'] = 'day';
    this.form['route'] = 'PO';
    this.form['orderType'] = 'lab';
    this.form['priority'] = 'normal';
    this.form['bedType'] = 'standard';
    this.form['category'] = 'Consumable';
    this.form['location'] = 'Ward Store';
    this.form['reorderLevel'] = 5;
    this.form['patientsCount'] = 1;
  }

  private buildPayload(): Record<string, unknown> | null {
    switch (this.moduleKey) {
      case 'admissions':
        if (!this.form['patientId'] || !this.form['roomId']) return null;
        return {
          patientId: this.form['patientId'],
          roomId: this.form['roomId'],
          consultantDoctorId: this.form['consultantDoctorId'] || undefined,
          admissionReason: this.form['admissionReason'],
          bedLabel: this.form['bedLabel'],
          notes: this.form['notes'],
        };
      case 'nursing-care':
        if (!this.form['patientId'] || !this.form['title']) return null;
        return {
          patientId: this.form['patientId'],
          title: this.form['title'],
          description: this.form['description'],
          priority: this.form['priority'] || 'normal',
          shift: this.form['shift'],
        };
      case 'mar':
        if (!this.form['patientId'] || !this.form['medicineName']) return null;
        return {
          patientId: this.form['patientId'],
          prescriptionId: this.form['prescriptionId'] || undefined,
          medicineName: this.form['medicineName'],
          dose: this.form['dose'],
          route: this.form['route'],
          notes: this.form['notes'],
          shift: this.form['shift'],
        };
      case 'drips-iv':
        if (!this.form['prescriptionId']) return null;
        return {
          prescriptionId: this.form['prescriptionId'],
          patientId: this.form['patientId'] || undefined,
          fluidName: this.form['fluidName'] || undefined,
          notes: this.form['notes'],
        };
      case 'vitals':
        if (!this.form['patientId']) return null;
        return {
          patientId: this.form['patientId'],
          doctorId: this.form['doctorId'] || undefined,
          notes: this.form['notes'],
          shift: this.form['shift'],
          vitals: {
            bloodPressure: this.form['bloodPressure'],
            temperature: this.form['temperature'],
            pulse: this.form['pulse'],
            weight: this.form['weight'],
          },
        };
      case 'io-chart':
        if (!this.form['patientId']) return null;
        return {
          patientId: this.form['patientId'],
          title: 'I/O Entry',
          description: this.form['notes'],
          shift: this.form['shift'],
          intake: this.form['intake'],
          output: this.form['output'],
          balance: this.form['balance'],
        };
      case 'orders-services':
        if (!this.form['patientId'] || !this.form['orderName']) return null;
        return {
          patientId: this.form['patientId'],
          orderType: this.form['orderType'],
          orderName: this.form['orderName'],
          doctorId: this.form['doctorId'] || undefined,
          notes: this.form['notes'],
          priority: this.form['priority'],
        };
      case 'shift-handover':
        if (!this.form['patientId'] || !this.form['patientCondition']) return null;
        return {
          patientId: this.form['patientId'],
          title: `Handover - ${this.form['shift']}`,
          description: this.form['description'],
          shift: this.form['shift'],
          nurseName: this.form['nurseName'],
          pending: this.form['pendingCount'],
          patientCondition: this.form['patientCondition'],
          pendingMedicines: this.form['pendingMedicines'],
          pendingLabs: this.form['pendingLabs'],
          runningDrips: this.form['runningDrips'],
          specialInstructions: this.form['specialInstructions'],
          riskAlerts: this.form['riskAlerts'],
          doctorInformed: this.form['doctorInformed'],
        };
      case 'inventory':
        if (!this.form['title']) return null;
        return {
          title: this.form['title'],
          description: this.form['description'],
          category: this.form['category'],
          quantity: this.form['quantity'],
          reorderLevel: this.form['reorderLevel'],
          location: this.form['location'],
        };
      default:
        return null;
    }
  }
}
