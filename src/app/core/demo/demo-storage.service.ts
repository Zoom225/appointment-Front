import { Injectable } from '@angular/core';
import { DemoState, createDemoState } from './demo-data';

export const DEMO_DATA_STORAGE_KEY = 'rendez_vous_demo_data_v1';

@Injectable({ providedIn: 'root' })
export class DemoStorageService {
  // Allows the demo to remain usable when the browser disables sessionStorage.
  private memory: DemoState | null = null;
  private memoryOnly = false;

  read(): DemoState {
    if (this.memoryOnly) return this.memory ? clone(this.memory) : this.seed();
    try {
      const raw = sessionStorage.getItem(DEMO_DATA_STORAGE_KEY);
      if (raw !== null) {
        let value: unknown;
        try {
          value = JSON.parse(raw);
        } catch {
          return this.seed();
        }
        if (isDemoState(value)) {
          this.memory = value;
          return clone(value);
        }
        return this.seed();
      }
    } catch {
      this.memoryOnly = true;
      if (this.memory) return clone(this.memory);
    }
    return this.memory ? clone(this.memory) : this.seed();
  }

  write(state: DemoState): void {
    this.memory = clone(state);
    if (this.memoryOnly) return;
    try {
      sessionStorage.setItem(DEMO_DATA_STORAGE_KEY, JSON.stringify(this.memory));
    } catch {
      // A blocked storage API must never trigger a fallback to the real backend.
      this.memoryOnly = true;
    }
  }

  resetDemo(): void {
    this.clear();
    this.seed();
  }

  clear(): void {
    this.memory = null;
    this.memoryOnly = false;
    try {
      sessionStorage.removeItem(DEMO_DATA_STORAGE_KEY);
    } catch {
      // No persistent storage is used in browsers which deny access.
      this.memoryOnly = true;
    }
  }

  private seed(): DemoState {
    const state = createDemoState();
    this.write(state);
    return clone(state);
  }
}

function clone(state: DemoState): DemoState {
  return JSON.parse(JSON.stringify(state)) as DemoState;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function date(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}

function id(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isDemoState(value: unknown): value is DemoState {
  if (!record(value) || value['version'] !== 1 || !date(value['generatedAt'])) return false;
  const users = value['users'];
  const appointments = value['appointments'];
  const notifications = value['notifications'];
  const audits = value['audits'];
  if (!Array.isArray(users) || !Array.isArray(appointments) || !Array.isArray(notifications) || !Array.isArray(audits)) return false;
  if (!users.every((user: unknown) => record(user) && id(user['id']) &&
    typeof user['email'] === 'string' && typeof user['firstName'] === 'string' && typeof user['lastName'] === 'string' &&
    Array.isArray(user['roles']) && user['roles'].every((role: unknown) => role === 'ROLE_USER' || role === 'ROLE_ADMIN'))) return false;
  const userIds = new Set(users.map((user: Record<string, unknown>) => user['id']));
  if (!userIds.has(9001) || !userIds.has(9002) || userIds.size !== users.length) return false;
  if (!appointments.every((item: unknown) => record(item) && id(item['id']) && userIds.has(item['userId']) &&
    typeof item['reason'] === 'string' && typeof item['publicReference'] === 'string' && item['publicReference'].startsWith('DEMO-RDV-') &&
    ['PENDING', 'SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(String(item['status'])) &&
    date(item['startDateTime']) && date(item['endDateTime']) && item['startDateTime'] < item['endDateTime'] &&
    date(item['createdAt']) && date(item['updatedAt']))) return false;
  const appointmentIds = new Set(appointments.map((item: Record<string, unknown>) => item['id']));
  const references = new Set(appointments.map((item: Record<string, unknown>) => item['publicReference']));
  if (appointmentIds.size !== appointments.length || references.size !== appointments.length) return false;
  if (!notifications.every((item: unknown) => record(item) && id(item['id']) && userIds.has(item['recipientId']) &&
    (item['appointmentId'] === null || appointmentIds.has(item['appointmentId'])) &&
    ['CREATED', 'UPDATED', 'CANCELLED', 'STATUS_CHANGED', 'REMINDER'].includes(String(item['type'])) &&
    typeof item['title'] === 'string' && typeof item['message'] === 'string' && date(item['createdAt']) &&
    (item['readAt'] === null || date(item['readAt'])))) return false;
  if (new Set(notifications.map((item: Record<string, unknown>) => item['id'])).size !== notifications.length ||
    new Set(audits.filter(record).map((item) => item['id'])).size !== audits.length) return false;
  return audits.every((item: unknown) => record(item) && id(item['id']) && appointmentIds.has(item['appointmentId']) &&
    ['CREATED', 'UPDATED', 'CANCELLED', 'STATUS_CHANGED'].includes(String(item['action'])) &&
    typeof item['actorEmail'] === 'string' && typeof item['details'] === 'string' && date(item['occurredAt']));
}
