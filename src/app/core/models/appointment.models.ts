export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

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
  userId?: string;
}
