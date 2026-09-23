import { AppointmentStatus } from '../models/appointment.models';

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'En attente',
  SCHEDULED: 'Planifié',
  CONFIRMED: 'Confirmé',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

export const ADMIN_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  SCHEDULED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function appointmentStatusLabel(status: AppointmentStatus): string {
  return APPOINTMENT_STATUS_LABELS[status];
}

export function appointmentStatusClass(status: AppointmentStatus): string {
  return `status-badge ${status.toLowerCase()}`;
}

export function allowedAdminTransitions(status: AppointmentStatus): AppointmentStatus[] {
  return ADMIN_STATUS_TRANSITIONS[status];
}
