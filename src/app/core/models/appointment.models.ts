export type AppointmentStatus = 'PENDING' | 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ['PENDING', 'SCHEDULED', 'CONFIRMED'];

export function normalizeAppointmentStatus(status: string | undefined): AppointmentStatus {
  const normalizedStatus = status?.trim().toUpperCase();

  if (
    normalizedStatus === 'PENDING' ||
    normalizedStatus === 'SCHEDULED' ||
    normalizedStatus === 'CONFIRMED' ||
    normalizedStatus === 'CANCELLED' ||
    normalizedStatus === 'COMPLETED'
  ) {
    return normalizedStatus;
  }

  return 'SCHEDULED';
}

export function isActiveAppointmentStatus(status: AppointmentStatus): boolean {
  return ACTIVE_APPOINTMENT_STATUSES.includes(status);
}

export interface Appointment {
  id: number;
  publicReference?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  startDateTime: string;
  endDateTime: string;
  reason: string;
  status: AppointmentStatus;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentCreateRequest {
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  reason: string;
  startDateTime: string;
  endDateTime: string;
}

export interface AppointmentUpdateRequest {
  reason: string;
  startDateTime: string;
  endDateTime: string;
}

export interface AppointmentStatusUpdateRequest {
  status: AppointmentStatus;
}

export interface AppointmentAvailabilitySlot {
  startDateTime: string;
  endDateTime: string;
}

export interface PublicAppointmentVerification {
  publicReference: string;
  contactFirstName: string;
  contactLastName: string;
  startDateTime: string;
  endDateTime: string;
  reason: string;
  status: AppointmentStatus;
}

export interface AppointmentAudit {
  id: number;
  appointmentId: number;
  action: 'CREATED' | 'UPDATED' | 'CANCELLED' | 'STATUS_CHANGED';
  actorEmail: string;
  occurredAt: string;
  details: string;
}
