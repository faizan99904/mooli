import { Injectable, computed, signal } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';

import { ApiResponse } from '../../shared/models/api-response.model';
import {
  Appointment,
  CreateSalePayload,
  CreateSaleResponse,
  Patient,
  Prescription,
} from '../../shared/models/hospital.model';
import { BackendService } from './backend.service';

export type MooliOfflineEntity = 'patient' | 'appointment' | 'prescription' | 'sale';
export type MooliOfflineOperation = 'create' | 'update' | 'status';
export type MooliOfflineStatus = 'queued' | 'syncing' | 'failed';

export interface MooliQueuedWork<TPayload = Record<string, unknown>> {
  id: string;
  entity: MooliOfflineEntity;
  operation: MooliOfflineOperation;
  localId?: string;
  targetId?: string;
  createdAt: string;
  payload: TPayload;
  status: MooliOfflineStatus;
  error?: string;
  meta?: Record<string, unknown>;
}

export interface MooliSyncResult {
  syncedCount: number;
  failedCount: number;
}

interface MooliOfflineDatabase extends IDBDatabase {}

@Injectable({ providedIn: 'root' })
export class MooliOfflineService {
  private static readonly DB_NAME = 'mooli-offline-workspace';
  private static readonly DB_VERSION = 1;
  private static readonly KV_STORE = 'kv';
  private static readonly OUTBOX_STORE = 'outbox';

  private readonly onlineSignal = signal(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  private readonly syncingSignal = signal(false);
  private readonly pendingCountSignal = signal(0);
  private readonly failedCountSignal = signal(0);
  private readonly dbPromise: Promise<MooliOfflineDatabase | null>;

  readonly online = computed(() => this.onlineSignal());
  readonly syncing = computed(() => this.syncingSignal());
  readonly pendingCount = computed(() => this.pendingCountSignal());
  readonly failedCount = computed(() => this.failedCountSignal());
  readonly statusLabel = computed(() => {
    if (!this.online()) {
      return this.pendingCount() > 0 ? `Offline - ${this.pendingCount()} pending` : 'Offline';
    }

    if (this.syncing()) {
      return 'Syncing';
    }

    if (this.failedCount() > 0) {
      return `Online - ${this.failedCount()} retry`;
    }

    return this.pendingCount() > 0 ? `Online - ${this.pendingCount()} pending` : 'Online';
  });
  readonly statusTone = computed(() => {
    if (!this.online()) return 'offline';
    if (this.syncing()) return 'syncing';
    if (this.failedCount() > 0) return 'failed';
    return 'online';
  });

  private readonly syncCompletedSubject = new Subject<MooliSyncResult>();
  readonly syncCompleted$ = this.syncCompletedSubject.asObservable();

  constructor(private backend: BackendService) {
    this.dbPromise = this.openDatabase();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }

    void this.refreshCounts();
  }

  cacheKey(prefix: string, ...parts: Array<string | number | null | undefined>): string {
    return [prefix, this.scopeKey(), ...parts.map((part) => part || 'all')].join(':');
  }

  scopeKey(): string {
    const user = this.currentUser();
    return `${user?.hospitalId || user?.companyId || 'tenant'}:${user?._id || 'user'}`;
  }

  buildLocalId(prefix: MooliOfflineEntity): string {
    return `local-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  shouldQueue(error?: unknown): boolean {
    const status = Number((error as { status?: number } | null)?.status ?? -1);
    return !this.online() || status === 0;
  }

  async cacheValue<T>(key: string, value: T): Promise<void> {
    await this.putValue(MooliOfflineService.KV_STORE, value, key);
  }

  async readCachedValue<T>(key: string, fallback: T): Promise<T> {
    const value = await this.getValue<T>(MooliOfflineService.KV_STORE, key);
    return value ?? fallback;
  }

  async mergeCachedList<T extends { _id?: string }>(key: string, items: T[]): Promise<T[]> {
    const existing = await this.readCachedValue<T[]>(key, []);
    const map = new Map<string, T>();
    [...existing, ...items].forEach((item) => {
      if (item?._id) {
        map.set(item._id, item);
      }
    });
    const merged = Array.from(map.values());
    await this.cacheValue(key, merged);
    return merged;
  }

  async enqueueWork<TPayload>(
    entry: Omit<MooliQueuedWork<TPayload>, 'createdAt' | 'status'> & {
      createdAt?: string;
      status?: MooliOfflineStatus;
    },
  ): Promise<MooliQueuedWork<TPayload>> {
    const queued: MooliQueuedWork<TPayload> = {
      ...entry,
      createdAt: entry.createdAt || new Date().toISOString(),
      status: entry.status || 'queued',
    };
    await this.putValue(MooliOfflineService.OUTBOX_STORE, queued);
    await this.refreshCounts();
    return queued;
  }

  async getQueuedWork(entity?: MooliOfflineEntity): Promise<MooliQueuedWork[]> {
    const entries = await this.getAllValues<MooliQueuedWork>(MooliOfflineService.OUTBOX_STORE);
    return entries
      .filter((entry) => !entity || entry.entity === entity)
      .sort((first, second) => first.createdAt.localeCompare(second.createdAt));
  }

  async removeQueuedWork(id: string): Promise<void> {
    await this.deleteValue(MooliOfflineService.OUTBOX_STORE, id);
    await this.refreshCounts();
  }

  async getSyncedRemoteId(localId: string): Promise<string | null> {
    if (!localId.startsWith('local-')) {
      return localId;
    }

    return this.readCachedValue<string | null>(this.idMapKey(localId), null);
  }

  async syncQueuedWork(): Promise<MooliSyncResult> {
    if (!this.online() || this.syncing()) {
      return { syncedCount: 0, failedCount: 0 };
    }

    const entries = this.sortForSync(await this.getQueuedWork());
    if (!entries.length) {
      await this.refreshCounts();
      this.syncCompletedSubject.next({ syncedCount: 0, failedCount: 0 });
      return { syncedCount: 0, failedCount: 0 };
    }

    this.syncingSignal.set(true);
    let syncedCount = 0;
    let failedCount = 0;

    for (const entry of entries) {
      await this.updateQueuedWork(entry.id, { status: 'syncing', error: undefined });

      try {
        await this.syncEntry(entry);
        await this.removeQueuedWork(entry.id);
        syncedCount += 1;
      } catch (error) {
        if (!this.online()) {
          await this.updateQueuedWork(entry.id, { status: 'queued', error: undefined });
          break;
        }

        failedCount += 1;
        await this.updateQueuedWork(entry.id, {
          status: 'failed',
          error: this.errorMessage(error),
        });
      }
    }

    this.syncingSignal.set(false);
    await this.refreshCounts();
    const result = { syncedCount, failedCount };
    this.syncCompletedSubject.next(result);
    return result;
  }

  private readonly handleOnline = (): void => {
    this.onlineSignal.set(true);
    void this.syncQueuedWork();
  };

  private readonly handleOffline = (): void => {
    this.onlineSignal.set(false);
  };

  private async syncEntry(entry: MooliQueuedWork): Promise<void> {
    if (entry.entity === 'patient') {
      await this.syncPatientEntry(entry);
      return;
    }

    if (entry.entity === 'appointment') {
      await this.syncAppointmentEntry(entry);
      return;
    }

    if (entry.entity === 'prescription') {
      await this.syncPrescriptionEntry(entry);
      return;
    }

    if (entry.entity === 'sale') {
      await firstValueFrom(this.backend.createSale(entry.payload as unknown as CreateSalePayload));
    }
  }

  private async syncPatientEntry(entry: MooliQueuedWork): Promise<void> {
    const payload = entry.payload as Record<string, unknown>;
    const response =
      entry.operation === 'update' && entry.targetId
        ? await firstValueFrom(this.backend.updatePatient(await this.resolveRequiredId(entry.targetId), payload))
        : await firstValueFrom(this.backend.createPatient(payload));
    const patient = this.responseData<Patient>(response);

    if (entry.localId && patient?._id) {
      await this.cacheValue(this.idMapKey(entry.localId), patient._id);
    }
  }

  private async syncAppointmentEntry(entry: MooliQueuedWork): Promise<void> {
    const payload = await this.resolvePatientPayload(entry.payload as Record<string, unknown>);

    if (entry.operation === 'status' && entry.targetId) {
      await firstValueFrom(
        this.backend.updateAppointmentStatus(await this.resolveRequiredId(entry.targetId), payload),
      );
      return;
    }

    const response =
      entry.operation === 'update' && entry.targetId
        ? await firstValueFrom(
            this.backend.updateAppointment(await this.resolveRequiredId(entry.targetId), payload),
          )
        : await firstValueFrom(this.backend.createAppointment(payload));
    const appointment = this.responseData<Appointment>(response);

    if (entry.localId && appointment?._id) {
      await this.cacheValue(this.idMapKey(entry.localId), appointment._id);
    }
  }

  private async syncPrescriptionEntry(entry: MooliQueuedWork): Promise<void> {
    const payload = await this.resolvePrescriptionPayload(entry.payload as Record<string, unknown>);
    const response =
      entry.operation === 'update' && entry.targetId
        ? await firstValueFrom(
            this.backend.updatePrescription(await this.resolveRequiredId(entry.targetId), payload),
          )
        : await firstValueFrom(this.backend.createPrescription(payload));
    const prescription = this.responseData<Prescription>(response);

    if (entry.localId && prescription?._id) {
      await this.cacheValue(this.idMapKey(entry.localId), prescription._id);
    }
  }

  private async resolvePatientPayload(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      ...payload,
      patientId: await this.resolveRequiredId(String(payload['patientId'] || '')),
    };
  }

  private async resolvePrescriptionPayload(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const resolved = await this.resolvePatientPayload(payload);
    if (resolved['appointmentId']) {
      resolved['appointmentId'] = await this.resolveRequiredId(String(resolved['appointmentId']));
    }
    return resolved;
  }

  private async resolveRequiredId(id: string): Promise<string> {
    if (!id.startsWith('local-')) {
      return id;
    }

    const mapped = await this.readCachedValue<string | null>(this.idMapKey(id), null);
    if (!mapped) {
      throw new Error(`Waiting for ${id} to sync first.`);
    }

    return mapped;
  }

  private responseData<T>(response: ApiResponse<T> | T): T {
    return (response as ApiResponse<T>)?.data ?? (response as T);
  }

  private sortForSync(entries: MooliQueuedWork[]): MooliQueuedWork[] {
    const order: Record<MooliOfflineEntity, number> = {
      patient: 1,
      appointment: 2,
      prescription: 3,
      sale: 4,
    };

    return [...entries].sort((first, second) => {
      const byEntity = order[first.entity] - order[second.entity];
      return byEntity || first.createdAt.localeCompare(second.createdAt);
    });
  }

  private async updateQueuedWork(
    id: string,
    patch: Partial<Pick<MooliQueuedWork, 'status' | 'error' | 'payload' | 'targetId'>>,
  ): Promise<void> {
    const current = await this.getValue<MooliQueuedWork>(MooliOfflineService.OUTBOX_STORE, id);
    if (!current) {
      return;
    }

    await this.putValue(MooliOfflineService.OUTBOX_STORE, { ...current, ...patch });
    await this.refreshCounts();
  }

  private async refreshCounts(): Promise<void> {
    const entries = await this.getAllValues<MooliQueuedWork>(MooliOfflineService.OUTBOX_STORE);
    this.pendingCountSignal.set(entries.length);
    this.failedCountSignal.set(entries.filter((entry) => entry.status === 'failed').length);
  }

  private idMapKey(localId: string): string {
    return `id-map:${this.scopeKey()}:${localId}`;
  }

  private currentUser(): { _id?: string; hospitalId?: string | null; companyId?: string | null } | null {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }

  private errorMessage(error: unknown): string {
    const value = error as { error?: { message?: string }; message?: string };
    return value?.error?.message || value?.message || 'Unable to sync offline work.';
  }

  private async openDatabase(): Promise<MooliOfflineDatabase | null> {
    if (typeof indexedDB === 'undefined') {
      return null;
    }

    return await new Promise<MooliOfflineDatabase | null>((resolve) => {
      const request = indexedDB.open(MooliOfflineService.DB_NAME, MooliOfflineService.DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(MooliOfflineService.KV_STORE)) {
          database.createObjectStore(MooliOfflineService.KV_STORE);
        }
        if (!database.objectStoreNames.contains(MooliOfflineService.OUTBOX_STORE)) {
          database.createObjectStore(MooliOfflineService.OUTBOX_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  private async withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T> | void,
  ): Promise<T | undefined> {
    const database = await this.dbPromise;
    if (!database) {
      return undefined;
    }

    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      transaction.oncomplete = () => resolve(request ? (request.result as T) : undefined);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    }).catch(() => undefined);
  }

  private async putValue<T>(storeName: string, value: T, key?: string): Promise<void> {
    await this.withStore(storeName, 'readwrite', (store) =>
      key === undefined ? store.put(value as never) : store.put(value as never, key),
    );
  }

  private async getValue<T>(storeName: string, key: string): Promise<T | undefined> {
    return await this.withStore<T>(storeName, 'readonly', (store) => store.get(key));
  }

  private async getAllValues<T>(storeName: string): Promise<T[]> {
    return (await this.withStore<T[]>(storeName, 'readonly', (store) => store.getAll())) || [];
  }

  private async deleteValue(storeName: string, key: string): Promise<void> {
    await this.withStore(storeName, 'readwrite', (store) => store.delete(key));
  }
}
