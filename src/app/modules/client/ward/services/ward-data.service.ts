import { Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BackendService } from '../../../../core/services/backend.service';
import {
  Doctor,
  Encounter,
  LabOrder,
  Patient,
  PatientHistory,
  Prescription,
  Room,
  RoomAllotment,
  HospitalWard,
  WardFloor,
} from '../../../../shared/models/hospital.model';
import { WardBedRecord, WardGalleryOption, WardRoomRecord } from '../ward-bed-management.models';
import {
  MonitoringCard,
  NursingSummaryRow,
  TodaySummaryRow,
  WardKpiCard,
  WardSection,
} from '../ward-dashboard.models';
import { WardModuleKey, WardModuleReportCard, WardModuleRow } from '../ward-module.models';
import { WardPatient } from '../ward-patient-list.models';
import {
  buildFloorOptions,
  buildDashboardKpis,
  buildDashboardSections,
  getWardOptionsFromCatalog,
  getWardOptionsFromRooms,
  mapAdmissionRows,
  mapAllotmentToWardPatient,
  mapDripRows,
  mapMarRows,
  mapNursingRows,
  mapOrderRows,
  mapRoomToWardBed,
  mapRoomToWardRoom,
  mapVitalsRows,
  mapWardActivityRows,
  mapWardApiBedToRecord,
  WardActivityRecord,
  matchesWardFilter,
  wardRoomPayloadFromForm,
} from './ward-api.mapper';

export interface WardBedManagementData {
  rooms: WardRoomRecord[];
  beds: WardBedRecord[];
  wardOptions: string[];
  hospitalWards: HospitalWard[];
  wardFloors: WardFloor[];
  floorOptions: WardGalleryOption[];
}

export interface WardDashboardData {
  kpiCards: WardKpiCard[];
  bedSections: WardSection[];
  todaySummary: TodaySummaryRow[];
  nursingSummary: NursingSummaryRow[];
  monitoringCards: MonitoringCard[];
  wardOptions: string[];
}

export interface WardClinicalBundle {
  allotments: RoomAllotment[];
  rooms: Room[];
  doctors: Doctor[];
  patients: Patient[];
  history: PatientHistory[];
  prescriptions: Prescription[];
  encounters: Encounter[];
  labOrders: LabOrder[];
  activities: WardActivityRecord[];
  wardBeds: Record<string, unknown>[];
}

@Injectable({ providedIn: 'root' })
export class WardDataService {
  constructor(private backend: BackendService) {}

  loadClinicalBundle(): Observable<WardClinicalBundle> {
    return forkJoin({
      allotments: this.backend.getRoomAllotments({ limit: 100 }),
      rooms: this.backend.getRooms({ limit: 100 }),
      doctors: this.backend.getDoctors({ limit: 100 }),
      patients: this.backend.getPatients({ limit: 100 }),
      history: this.backend.getPatientHistoryRecords({ recordType: 'ward', limit: 100 }),
      prescriptions: this.backend.getPrescriptions({ limit: 100 }),
      encounters: this.backend.getEncounters({ type: 'admission', limit: 100 }),
      labOrders: this.backend.getLabOrders({ limit: 100 }),
      activities: this.backend.getWardActivities({ limit: 100 }),
      wardBeds: this.backend.getWardBeds({ limit: 100 }),
    }).pipe(
      map((result) => ({
        allotments: result.allotments.items,
        rooms: result.rooms.items,
        doctors: result.doctors.items,
        patients: result.patients.items,
        history: result.history.items,
        prescriptions: result.prescriptions.items,
        encounters: result.encounters.items,
        labOrders: result.labOrders.items,
        activities: result.activities.items as unknown as WardActivityRecord[],
        wardBeds: result.wardBeds.items,
      })),
      catchError(() =>
        of({
          allotments: [],
          rooms: [],
          doctors: [],
          patients: [],
          history: [],
          prescriptions: [],
          encounters: [],
          labOrders: [],
          activities: [],
          wardBeds: [],
        })
      )
    );
  }

  loadAdmittedPatients(wardFilter = ''): Observable<WardPatient[]> {
    return this.loadClinicalBundle().pipe(
      map((bundle) =>
        bundle.allotments
          .filter((allotment) => matchesWardFilter(allotment.room, wardFilter))
          .map((allotment) =>
            mapAllotmentToWardPatient(
              allotment,
              bundle.doctors,
              bundle.history,
              bundle.prescriptions,
              bundle.encounters
            )
          )
      )
    );
  }

  loadPatientByAdmission(admissionId: string): Observable<WardPatient | null> {
    return forkJoin({
      allotment: this.backend.getRoomAllotment(admissionId),
      doctors: this.backend.getDoctors({ limit: 100 }),
      history: this.backend.getPatientHistoryRecords({ recordType: 'ward', limit: 100 }),
      prescriptions: this.backend.getPrescriptions({ limit: 100 }),
      encounters: this.backend.getEncounters({ type: 'admission', limit: 100 }),
    }).pipe(
      map((result) =>
        mapAllotmentToWardPatient(
          result.allotment,
          result.doctors.items,
          result.history.items,
          result.prescriptions.items,
          result.encounters.items
        )
      ),
      catchError(() => of(null))
    );
  }

  loadBedManagement(wardFilter = ''): Observable<WardBedManagementData> {
    return this.backend.getHospitalWards({ limit: 100, status: 'active' }).pipe(
      switchMap((hospitalWards) => {
        const wards = hospitalWards.items;
        const activeWard = wards.find((ward) => ward.name === wardFilter) || wards[0];
        const floors$ =
          wards.length === 0
            ? of([] as WardFloor[])
            : forkJoin(
                wards.map((ward) =>
                  this.backend.getWardFloors(ward._id, { limit: 100, status: 'active' }).pipe(
                    map((response) => response.items),
                    catchError(() => of([] as WardFloor[]))
                  )
                )
              ).pipe(map((groups) => groups.flat()));

        return forkJoin({
          wards: of(wards),
          floors: floors$,
          rooms: this.backend.getRooms({ limit: 100 }),
          allotments: this.backend.getRoomAllotments({ status: 'admitted', limit: 100 }),
          wardBeds: this.backend.getWardBeds({ limit: 100 }),
        });
      }),
      map(({ wards, floors, rooms, allotments, wardBeds }) => {
        const wardFloors = floors;
        const activeWard = wards.find((ward) => ward.name === wardFilter) || wards[0];
        const filteredRooms = rooms.items.filter((room) => matchesWardFilter(room, wardFilter, wards));
        const wardRooms = filteredRooms.map((room) => {
          const allotment = allotments.items.find((item) => item.roomId === room._id && item.status === 'admitted');
          return mapRoomToWardRoom(room, allotment);
        });

        const apiBeds = wardBeds.items
          .filter((bed) => filteredRooms.some((room) => room._id === bed['roomId']))
          .map((bed) => {
            const allotment = allotments.items.find(
              (item) => item.roomId === bed['roomId'] && item.status === 'admitted'
            );
            return mapWardApiBedToRecord(bed, allotment);
          });

        const fallbackBeds =
          apiBeds.length > 0
            ? apiBeds
            : filteredRooms.map((room) => {
                const allotment = allotments.items.find(
                  (item) => item.roomId === room._id && item.status === 'admitted'
                );
                return mapRoomToWardBed(room, allotment);
              });

        return {
          rooms: wardRooms,
          beds: fallbackBeds,
          wardOptions: wards.length
            ? getWardOptionsFromCatalog(wards)
            : getWardOptionsFromRooms(rooms.items, wards),
          hospitalWards: wards,
          wardFloors,
          floorOptions: buildFloorOptions(wardFloors, activeWard?._id || ''),
        };
      }),
      catchError(() =>
        of({
          rooms: [],
          beds: [],
          wardOptions: [],
          hospitalWards: [],
          wardFloors: [],
          floorOptions: [],
        })
      )
    );
  }

  createHospitalWard(payload: Record<string, unknown>) {
    return this.backend.createHospitalWard(payload);
  }

  createWardFloor(wardId: string, payload: Record<string, unknown>) {
    return this.backend.createWardFloor(wardId, payload);
  }

  loadWardFloors(wardId: string) {
    return this.backend.getWardFloors(wardId, { limit: 100, status: 'active' });
  }

  loadDashboard(wardFilter = ''): Observable<WardDashboardData> {
    return this.loadClinicalBundle().pipe(
      map((bundle) => {
        const rooms = bundle.rooms.filter((room) => matchesWardFilter(room, wardFilter));
        const allotments = bundle.allotments.filter((item) => matchesWardFilter(item.room, wardFilter));
        const admittedCount = allotments.length;

        return {
          kpiCards: buildDashboardKpis(rooms, allotments),
          bedSections: buildDashboardSections(rooms, allotments),
          todaySummary: [
            { label: 'Admitted Patients', value: admittedCount, route: '/ward/patient-list' },
            { label: 'Ward Records', value: bundle.history.length, route: '/ward-admin' },
            { label: 'Running Drips', value: bundle.prescriptions.flatMap((item) => item.ivFluids || []).filter((fluid) => fluid.status === 'running').length, route: '/ward/drips-iv' },
            { label: 'Lab Orders', value: bundle.labOrders.length, route: '/ward/orders-services' },
          ],
          nursingSummary: [
            { label: 'Ward Notes', value: bundle.history.length, tone: 'green' },
            { label: 'Vitals Records', value: bundle.history.filter((item) => item.vitals && Object.keys(item.vitals).length).length, tone: 'amber' },
            { label: 'Open Encounters', value: bundle.encounters.filter((item) => item.status === 'admitted').length, tone: 'gray' },
          ],
          monitoringCards: [
            { key: 'admissions', label: 'Admitted Patients', value: admittedCount, actionLabel: 'View List', route: '/ward/patient-list', icon: 'fa-user-plus', tone: 'blue' },
            { key: 'medications', label: 'Medication Orders', value: bundle.prescriptions.reduce((total, item) => total + (item.medicines?.length || 0), 0), actionLabel: 'View MAR', route: '/ward/mar', icon: 'fa-medkit', tone: 'green' },
            { key: 'vitals', label: 'Ward Records', value: bundle.history.length, actionLabel: 'View Vitals', route: '/ward/vitals', icon: 'fa-heartbeat', tone: 'teal' },
            { key: 'drips', label: 'Drips Running', value: bundle.prescriptions.flatMap((item) => item.ivFluids || []).filter((fluid) => fluid.status === 'running').length, actionLabel: 'View List', route: '/ward/drips-iv', icon: 'fa-tint', tone: 'blue' },
            { key: 'tasks', label: 'Nursing Notes', value: bundle.history.length, actionLabel: 'View Tasks', route: '/ward/nursing-care', icon: 'fa-tasks', tone: 'amber' },
            { key: 'alerts', label: 'Lab Orders', value: bundle.labOrders.length, actionLabel: 'View Alerts', route: '/ward/reports', icon: 'fa-exclamation-triangle', tone: 'red' },
          ],
          wardOptions: getWardOptionsFromRooms(bundle.rooms),
        };
      })
    );
  }

  loadModuleRows(moduleKey: WardModuleKey, tab: string, search: string): Observable<WardModuleRow[]> {
    return this.loadClinicalBundle().pipe(
      map((bundle) => {
        let rows: WardModuleRow[] = [];

        switch (moduleKey) {
          case 'admissions': {
            const admitted = mapAdmissionRows(
              bundle.allotments.filter((item) => item.status === 'admitted'),
              bundle.doctors
            );
            const pending = mapWardActivityRows(
              bundle.activities.filter((item) => item.activityType === 'admission_request'),
              'admission_request'
            );
            rows = [...admitted, ...pending];
            break;
          }
          case 'nursing-care':
            rows = [
              ...mapWardActivityRows(
                bundle.activities.filter((item) => item.activityType === 'nursing_task'),
                'nursing_task'
              ),
              ...mapNursingRows(bundle.history),
            ];
            break;
          case 'mar':
            rows = [
              ...mapWardActivityRows(
                bundle.activities.filter((item) => item.activityType === 'mar_dose'),
                'mar_dose'
              ),
              ...mapMarRows(bundle.prescriptions),
            ];
            break;
          case 'drips-iv':
            rows = mapDripRows(bundle.prescriptions);
            break;
          case 'vitals':
            rows = mapVitalsRows(bundle.history);
            break;
          case 'io-chart':
            rows = mapWardActivityRows(
              bundle.activities.filter((item) => item.activityType === 'io_entry'),
              'io_entry'
            );
            break;
          case 'orders-services':
            rows = mapOrderRows(bundle.labOrders, bundle.prescriptions);
            break;
          case 'shift-handover':
            rows = mapWardActivityRows(
              bundle.activities.filter((item) => item.activityType === 'handover'),
              'handover'
            );
            break;
          case 'inventory':
            rows = mapWardActivityRows(
              bundle.activities.filter((item) => item.activityType === 'inventory'),
              'inventory'
            );
            break;
          default:
            rows = [];
        }

        const normalizedSearch = search.trim().toLowerCase();
        return rows.filter((row) => {
          const tabValue = row.cells['_tab'] || 'all';
          if (tab !== 'all' && tabValue !== tab) {
            return false;
          }
          if (!normalizedSearch) {
            return true;
          }
          return Object.values(row.cells).join(' ').toLowerCase().includes(normalizedSearch);
        });
      })
    );
  }

  loadReportCards(tab: string, search: string): Observable<WardModuleReportCard[]> {
    return this.backend.getWardReports().pipe(
      map((data) => {
        const cards: WardModuleReportCard[] = (data['reports'] as Array<Record<string, string>> | undefined)?.map(
          (item) => ({
            id: item['id'] || '',
            title: item['title'] || '',
            description: item['description'] || '',
            actionLabel: 'Open Report',
          })
        ) || [];

        const normalizedSearch = search.trim().toLowerCase();
        return cards.filter(
          (card) => !normalizedSearch || `${card.title} ${card.description}`.toLowerCase().includes(normalizedSearch)
        );
      }),
      catchError(() => this.loadClinicalBundle().pipe(
        map((bundle) => [
          { id: 'occupancy', title: 'Ward Occupancy Summary', description: `${bundle.allotments.length} admitted patients`, actionLabel: 'Open Report' },
          { id: 'records', title: 'Ward Clinical Records', description: `${bundle.history.length} ward notes`, actionLabel: 'Open Report' },
        ])
      ))
    );
  }

  loadActionOptions(): Observable<WardClinicalBundle> {
    return this.loadClinicalBundle();
  }

  submitModuleAction(moduleKey: WardModuleKey, payload: Record<string, unknown>): Observable<unknown> {
    switch (moduleKey) {
      case 'admissions':
        return this.backend.createWardAdmission(payload);
      case 'nursing-care':
        return this.backend.createWardActivity({
          activityType: 'nursing_task',
          ...payload,
          status: 'due',
        });
      case 'mar':
        return this.backend.recordWardDose(payload);
      case 'drips-iv':
        return this.backend.wardDripAction({ action: 'start', ...payload });
      case 'vitals':
        return this.backend.recordWardVitals(payload);
      case 'io-chart':
        return this.backend.createWardActivity({
          activityType: 'io_entry',
          status: 'completed',
          ...payload,
          metadata: {
            intake: payload['intake'],
            output: payload['output'],
            balance: payload['balance'],
          },
        });
      case 'orders-services':
        return this.backend.createWardOrder(payload);
      case 'shift-handover':
        return this.backend.createWardActivity({
          activityType: 'handover',
          status: 'completed',
          ...payload,
          metadata: {
            nurseName: payload['nurseName'],
            patients: payload['patients'],
            pending: payload['pending'],
          },
        });
      case 'inventory':
        return this.backend.createWardActivity({
          activityType: 'inventory',
          title: payload['title'],
          description: payload['description'],
          status: 'completed',
          metadata: {
            category: payload['category'],
            quantity: payload['quantity'],
            reorderLevel: payload['reorderLevel'],
            location: payload['location'],
          },
        });
      default:
        return this.backend.createWardActivity(payload);
    }
  }

  createWardBed(payload: Record<string, unknown>) {
    return this.backend.createWardBed(payload);
  }

  updateWardBed(id: string, payload: Record<string, unknown>) {
    return this.backend.updateWardBed(id, payload);
  }

  deleteWardBed(id: string) {
    return this.backend.deleteWardBed(id);
  }

  transferAdmission(id: string, payload: Record<string, unknown>) {
    return this.backend.transferRoomAllotment(id, payload);
  }

  assignNurse(admissionId: string, nurseId: string) {
    return this.backend.assignNurseToAllotment(admissionId, { assignedNurseId: nurseId });
  }

  createRoom(payload: Record<string, unknown>) {
    return this.backend.createRoom(payload);
  }

  updateRoom(id: string, payload: Record<string, unknown>) {
    return this.backend.updateRoom(id, payload);
  }

  deleteRoom(id: string) {
    return this.backend.deleteRoom(id);
  }

  dischargeAllotment(id: string, payload: Record<string, unknown> = {}) {
    return this.backend.dischargeRoomAllotment(id, payload);
  }

  buildRoomPayload(value: {
    roomName: string;
    roomType: WardRoomRecord['roomType'];
    wardId?: string;
    floorId?: string;
    floor?: string;
    dailyCharge: number;
    status?: Room['status'];
  }) {
    return wardRoomPayloadFromForm(value);
  }
}
