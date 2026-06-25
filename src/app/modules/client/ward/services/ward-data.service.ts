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
  ListResult,
} from '../../../../shared/models/hospital.model';
import { WardBedRecord, WardGalleryOption, WardRoomRecord } from '../ward-bed-management.models';
import {
  MonitoringCard,
  NursingSummaryRow,
  TodaySummaryRow,
  WardAlertRow,
  WardKpiCard,
  WardSection,
  WardTaskRow,
} from '../ward-dashboard.models';
import { WardModuleKey, WardModuleReportCard, WardModuleRow, WardModuleFilters } from '../ward-module.models';
import { WardPatient } from '../ward-patient-list.models';
import {
  buildFloorOptions,
  buildDashboardAlerts,
  buildDashboardKpis,
  buildDashboardSections,
  buildDashboardTasks,
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
  filterModuleRows,
  WardActivityRecord,
  matchesWardFilter,
  normalizeHospitalWardRecord,
  normalizeHospitalWardRecords,
  normalizeWardFloorRecord,
  normalizeWardFloorRecords,
  normalizeWardVitalsRecord,
  normalizeEntityId,
  resolvePrescriptionPatientId,
  wardRoomPayloadFromForm,
  WardVitalTimelineEntry,
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
  todayAlerts: WardAlertRow[];
  nursingTasks: WardTaskRow[];
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

  private emptyList<T>(): ListResult<T> {
    return {
      items: [],
      pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
    };
  }

  private safeList<T>(request: Observable<ListResult<T>>): Observable<ListResult<T>> {
    return request.pipe(catchError(() => of(this.emptyList<T>())));
  }

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
    return this.safeList(this.backend.getHospitalWards({ limit: 100 })).pipe(
      switchMap((hospitalWards) => {
        const wards = normalizeHospitalWardRecords(hospitalWards.items);
        const floors$ =
          wards.length === 0
            ? of([] as WardFloor[])
            : forkJoin(
                wards.map((ward) =>
                  this.safeList(this.backend.getWardFloors(ward._id, { limit: 100 })).pipe(
                    map((response) => normalizeWardFloorRecords(response.items, ward._id))
                  )
                )
              ).pipe(map((groups) => groups.flat()));

        return forkJoin({
          wards: of(wards),
          floors: floors$,
          rooms: this.safeList(this.backend.getRooms({ limit: 100 })),
          allotments: this.safeList(this.backend.getRoomAllotments({ status: 'admitted', limit: 100 })),
          wardBeds: this.safeList(this.backend.getWardBeds({ limit: 100 })),
        });
      }),
      map(({ wards, floors, rooms, allotments, wardBeds }) => {
        const wardFloors = floors as WardFloor[];
        const activeWard = wards.find((ward) => ward.name === wardFilter) || wards[0];
        const allRooms = rooms.items;
        const wardRooms = allRooms.map((room) => {
          const allotment = allotments.items.find((item) => item.roomId === room._id && item.status === 'admitted');
          return mapRoomToWardRoom(room, allotment);
        });

        const roomIds = new Set(allRooms.map((room) => String(room._id)));
        const admittedAllotments = allotments.items.filter((item) => item.status === 'admitted');
        const claimedLegacyAllotments = new Set<string>();
        const findAllotmentForBed = (bed: Record<string, unknown>): RoomAllotment | undefined => {
          const bedId = normalizeEntityId(bed['_id']);
          const roomId = String(bed['roomId'] || '');
          const direct = admittedAllotments.find((item) => normalizeEntityId(item.bedId) === bedId);
          if (direct) {
            return direct;
          }

          const legacyInRoom = admittedAllotments.filter(
            (item) =>
              !normalizeEntityId(item.bedId) &&
              String(item.roomId) === roomId &&
              !claimedLegacyAllotments.has(normalizeEntityId(item._id))
          );
          const bedNo = String(bed['bedNo'] || '');
          const legacy =
            legacyInRoom.find((item) => String(item.bedLabel || '') === bedNo) ||
            legacyInRoom[0];
          if (legacy) {
            claimedLegacyAllotments.add(normalizeEntityId(legacy._id));
          }
          return legacy;
        };
        const apiBedsByRoom = new Map<string, WardBedRecord[]>();
        wardBeds.items
          .filter((bed) => roomIds.has(String(bed['roomId'])))
          .forEach((bed) => {
            const allotment = findAllotmentForBed(bed);
            const record = mapWardApiBedToRecord(bed, allotment);
            const roomKey = String(record.roomId);
            const group = apiBedsByRoom.get(roomKey) || [];
            group.push(record);
            apiBedsByRoom.set(roomKey, group);
          });

        const fallbackBeds = allRooms.flatMap((room) => {
          const persisted = apiBedsByRoom.get(String(room._id));
          if (persisted?.length) {
            return persisted;
          }

          const allotment = admittedAllotments.find(
            (item) => item.roomId === room._id && !normalizeEntityId(item.bedId)
          );
          return [mapRoomToWardBed(room, allotment)];
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
      })
    );
  }

  refreshHospitalWards(search = ''): Observable<HospitalWard[]> {
    const params: Record<string, unknown> = { limit: 100 };
    const query = search.trim();
    if (query) {
      params['search'] = query;
    }

    return this.safeList(this.backend.getHospitalWards(params)).pipe(
      map((result) => normalizeHospitalWardRecords(result.items)),
      switchMap((wards) => {
        if (wards.length || !query) {
          return of(wards);
        }

        return this.safeList(this.backend.getHospitalWards({ limit: 100 })).pipe(
          map((fallback) =>
            normalizeHospitalWardRecords(fallback.items).filter(
              (ward) => ward.name.toLowerCase() === query.toLowerCase()
            )
          )
        );
      })
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

  fetchWardFloors(wardId: string): Observable<WardFloor[]> {
    const id = String(wardId || '').trim();
    if (!id) {
      return of([]);
    }

    return this.backend.getWardFloors(id, { limit: 100 }).pipe(
      map((result) => normalizeWardFloorRecords(result.items, id)),
      catchError(() => of([] as WardFloor[]))
    );
  }

  loadDashboard(wardFilter = ''): Observable<WardDashboardData> {
    return forkJoin({
      bundle: this.loadClinicalBundle(),
      hospitalWards: this.safeList(this.backend.getHospitalWards({ limit: 100 })),
    }).pipe(
      map(({ bundle, hospitalWards }) => {
        const wards = normalizeHospitalWardRecords(hospitalWards.items);
        const allRooms = bundle.rooms;
        const allAllotments = bundle.allotments;
        const scopedRooms = wardFilter
          ? allRooms.filter((room) => matchesWardFilter(room, wardFilter, wards))
          : allRooms;
        const scopedAllotments = wardFilter
          ? allAllotments.filter((item) => matchesWardFilter(item.room, wardFilter, wards))
          : allAllotments;
        const admittedCount = scopedAllotments.filter((item) => item.status === 'admitted').length;
        const bundleContext = {
          doctors: bundle.doctors,
          history: bundle.history,
          prescriptions: bundle.prescriptions,
          encounters: bundle.encounters,
          labOrders: bundle.labOrders,
          activities: bundle.activities,
        };

        const dashboardRooms = wardFilter ? scopedRooms : allRooms;
        const dashboardAllotments = wardFilter ? scopedAllotments : allAllotments;
        const dashboardRoomIds = new Set(dashboardRooms.map((room) => String(room._id)));
        const dashboardWardBeds = bundle.wardBeds.filter((bed) =>
          dashboardRoomIds.has(normalizeEntityId(bed['roomId']) || normalizeEntityId((bed['room'] as Record<string, unknown> | undefined)?.['_id']))
        );

        return {
          kpiCards: buildDashboardKpis(dashboardRooms, dashboardAllotments, bundleContext, dashboardWardBeds),
          bedSections: buildDashboardSections(dashboardRooms, dashboardAllotments, wards, bundleContext, dashboardWardBeds),
          todaySummary: [
            { label: 'Admitted Patients', value: admittedCount, route: '/ward/patient-list' },
            { label: 'Medicine Due', value: bundle.prescriptions.reduce((total, item) => total + (item.medicines?.length || 0), 0), route: '/ward/mar' },
            { label: 'Running Drips', value: bundle.prescriptions.flatMap((item) => item.ivFluids || []).filter((fluid) => fluid.status === 'running').length, route: '/ward/drips-iv' },
            { label: 'Lab Orders', value: bundle.labOrders.length, route: '/ward/orders-services' },
          ],
          todayAlerts: buildDashboardAlerts(bundleContext, scopedAllotments),
          nursingTasks: buildDashboardTasks(bundleContext, scopedAllotments),
          nursingSummary: [
            { label: 'Medicine Due', value: bundle.prescriptions.reduce((total, item) => total + (item.medicines?.length || 0), 0), tone: 'amber', route: '/ward/mar' },
            { label: 'Vitals Overdue', value: scopedAllotments.filter((item) => item.status === 'admitted').reduce((total, allotment) => total + (bundle.history.some((record) => record.patientId === allotment.patientId && record.vitals) ? 0 : 1), 0), tone: 'red', route: '/ward/vitals' },
            { label: 'Nursing Notes', value: bundle.history.length, tone: 'green', route: '/ward/nursing-care' },
            { label: 'Drips Running', value: bundle.prescriptions.flatMap((item) => item.ivFluids || []).filter((fluid) => fluid.status === 'running').length, tone: 'purple', route: '/ward/drips-iv' },
          ],
          monitoringCards: [
            { key: 'admissions', label: 'Admitted Patients', value: admittedCount, actionLabel: 'View List', route: '/ward/patient-list', icon: 'fa-user-plus', tone: 'blue' },
            { key: 'medications', label: 'Medication Due', value: bundle.prescriptions.reduce((total, item) => total + (item.medicines?.length || 0), 0), actionLabel: 'Open MAR', route: '/ward/mar', icon: 'fa-medkit', tone: 'green' },
            { key: 'vitals', label: 'Vitals Due', value: scopedAllotments.filter((item) => item.status === 'admitted').reduce((total, allotment) => total + (bundle.history.some((record) => record.patientId === allotment.patientId && record.vitals) ? 0 : 1), 0), actionLabel: 'Add Vitals', route: '/ward/vitals', icon: 'fa-heartbeat', tone: 'teal' },
            { key: 'drips', label: 'Drips Running', value: bundle.prescriptions.flatMap((item) => item.ivFluids || []).filter((fluid) => fluid.status === 'running').length, actionLabel: 'View Drips', route: '/ward/drips-iv', icon: 'fa-tint', tone: 'blue' },
            { key: 'tasks', label: 'Nursing Notes', value: bundle.history.length, actionLabel: 'Open Notes', route: '/ward/nursing-care', icon: 'fa-sticky-note', tone: 'amber' },
            { key: 'alerts', label: 'Shift Handover', value: bundle.activities.filter((item) => item.activityType === 'handover').length, actionLabel: 'Open Handover', route: '/ward/shift-handover', icon: 'fa-exchange', tone: 'red' },
          ],
          wardOptions: getWardOptionsFromRooms(allRooms, wards),
        };
      })
    );
  }

  loadModuleRows(
    moduleKey: WardModuleKey,
    tab: string,
    search: string,
    filters: WardModuleFilters = {}
  ): Observable<WardModuleRow[]> {
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
            rows = mapVitalsRows(bundle.history, bundle.prescriptions, bundle.allotments);
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

        rows = filterModuleRows(rows, bundle.allotments, filters);

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

  loadPatientVitalsTimeline(patientId: string): Observable<WardVitalTimelineEntry[]> {
    const normalizedPatientId = normalizeEntityId(patientId);
    if (!normalizedPatientId) {
      return of([]);
    }

    return this.loadClinicalBundle().pipe(
      map((bundle) => {
        const fromHistory = bundle.history
          .filter(
            (item) =>
              normalizeEntityId(item.patientId) === normalizedPatientId &&
              item.vitals &&
              Object.values(item.vitals).some((value) => String(value || '').trim())
          )
          .map((item) => ({
            createdAt: item.createdAt,
            vitals: normalizeWardVitalsRecord(item.vitals || {}),
          }));

        const fromPrescriptions = bundle.prescriptions
          .filter(
            (prescription) =>
              resolvePrescriptionPatientId(prescription) === normalizedPatientId &&
              prescription.vitals &&
              Object.values(prescription.vitals).some((value) => String(value || '').trim())
          )
          .map((prescription) => ({
            createdAt: prescription.createdAt,
            vitals: normalizeWardVitalsRecord(prescription.vitals || {}),
          }));

        return [...fromHistory, ...fromPrescriptions].sort(
          (first, second) => new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime()
        );
      })
    );
  }

  findPatient(patientId: string): Observable<Patient | null> {
    const normalizedPatientId = normalizeEntityId(patientId);
    return this.loadClinicalBundle().pipe(
      map((bundle) => bundle.patients.find((patient) => normalizeEntityId(patient._id) === normalizedPatientId) || null)
    );
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

  updateDripStatus(payload: {
    action: 'start' | 'stop' | 'complete';
    prescriptionId: string;
    fluidIndex?: number;
    fluidName?: string;
    patientId?: string;
    admissionId?: string;
    notes?: string;
  }) {
    return this.backend.wardDripAction({
      ...payload,
      fluidIndex: payload.fluidIndex ?? undefined,
    }).pipe(map((response) => (response.data || {}) as Record<string, unknown>));
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
