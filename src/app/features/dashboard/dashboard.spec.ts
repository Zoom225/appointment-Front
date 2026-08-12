import { describe, expect, it } from 'vitest';
import { Appointment } from '../../core/models/appointment.models';
import { getNextActiveFutureAppointment } from './dashboard.utils';

function createAppointment(
  id: number,
  status: Appointment['status'],
  startDateTime: string,
): Appointment {
  return {
    id,
    status,
    startDateTime,
    endDateTime: startDateTime,
    reason: `Rendez-vous ${id}`,
    userId: 1,
  };
}

describe('getNextActiveFutureAppointment', () => {
  const now = new Date('2026-08-12T10:00:00').getTime();

  it('ignores future cancelled and completed appointments', () => {
    const nextAppointment = getNextActiveFutureAppointment(
      [
        createAppointment(1, 'CANCELLED', '2026-08-12T10:15:00'),
        createAppointment(2, 'COMPLETED', '2026-08-12T10:30:00'),
        createAppointment(3, 'CONFIRMED', '2026-08-12T10:45:00'),
      ],
      now,
    );

    expect(nextAppointment?.id).toBe(3);
  });

  it('allows pending, scheduled and confirmed appointments', () => {
    expect(getNextActiveFutureAppointment([createAppointment(1, 'PENDING', '2026-08-12T10:15:00')], now)?.id).toBe(1);
    expect(getNextActiveFutureAppointment([createAppointment(2, 'SCHEDULED', '2026-08-12T10:15:00')], now)?.id).toBe(2);
    expect(getNextActiveFutureAppointment([createAppointment(3, 'CONFIRMED', '2026-08-12T10:15:00')], now)?.id).toBe(3);
  });

  it('selects the closest active future appointment', () => {
    const nextAppointment = getNextActiveFutureAppointment(
      [
        createAppointment(1, 'CONFIRMED', '2026-08-12T12:00:00'),
        createAppointment(2, 'SCHEDULED', '2026-08-12T10:30:00'),
        createAppointment(3, 'PENDING', '2026-08-12T11:00:00'),
      ],
      now,
    );

    expect(nextAppointment?.id).toBe(2);
  });

  it('returns null when there is no active future appointment', () => {
    const nextAppointment = getNextActiveFutureAppointment(
      [
        createAppointment(1, 'CANCELLED', '2026-08-12T10:15:00'),
        createAppointment(2, 'COMPLETED', '2026-08-12T10:30:00'),
        createAppointment(3, 'CONFIRMED', '2026-08-12T09:30:00'),
      ],
      now,
    );

    expect(nextAppointment).toBeNull();
  });
});
