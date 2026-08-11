export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

export function normalizeAppointmentStatus(status: string | undefined): AppointmentStatus {
  const normalizedStatus = status?.trim().toLowerCase();

  if (
    normalizedStatus === 'scheduled' ||
    normalizedStatus === 'confirmed' ||
    normalizedStatus === 'cancelled' ||
    normalizedStatus === 'completed'
  ) {
    return normalizedStatus;
  }

  return 'scheduled';
}

export interface BackendAppointment {
  id?: string | number;
  _id?: string;
  title?: string;
  reason?: string;
  startsAt?: string;
  starts_at?: string;
  startDateTime?: string;
  startDate?: string;
  date?: string;
  endsAt?: string;
  ends_at?: string;
  endDateTime?: string;
  endDate?: string;
  status?: string;
  patientName?: string;
  patient_name?: string;
  userId?: string | number;
  user_id?: string | number;
}

export interface Appointment {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  patientName?: string;
  userId?: string;
}

export interface CreateAppointmentPayload {
  title: string;
  startsAt: string;
  endsAt: string;
  patientName?: string;
}

export interface AppointmentCreateRequest {
  reason: string;
  startDateTime: string;
  endDateTime: string;
  userId: number;
}

export type UpdateAppointmentPayload = Partial<CreateAppointmentPayload> & {
  status?: AppointmentStatus;
};
