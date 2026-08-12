import { Appointment, isActiveAppointmentStatus } from '../../core/models/appointment.models';

export function getNextActiveFutureAppointment(
  appointments: Appointment[],
  now = Date.now(),
): Appointment | null {
  return (
    appointments
      .filter((appointment) => isActiveAppointmentStatus(appointment.status))
      .filter((appointment) => new Date(appointment.startDateTime).getTime() > now)
      .sort(
        (left, right) =>
          new Date(left.startDateTime).getTime() - new Date(right.startDateTime).getTime(),
      )[0] ?? null
  );
}
