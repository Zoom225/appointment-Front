export type AppointmentStatus = 'PENDING' | 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

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

export interface Appointment {
  id: number;
  startDateTime: string;
  endDateTime: string;
  reason: string;
  status: AppointmentStatus;
  userId: number;
}

export interface AppointmentCreateRequest {
  reason: string;
  startDateTime: string;
  endDateTime: string;
  userId: number;
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

export interface AppointmentAudit {
  id: number;
  appointmentId: number;
  action: 'CREATED' | 'UPDATED' | 'CANCELLED' | 'STATUS_CHANGED';
  actorEmail: string;
  occurredAt: string;
  details: string;
}
