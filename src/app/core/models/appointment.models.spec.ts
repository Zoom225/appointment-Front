import { describe, expect, it } from 'vitest';
import { isActiveAppointmentStatus, normalizeAppointmentStatus } from './appointment.models';

describe('appointment models', () => {
  it('normalizes backend appointment statuses', () => {
    expect(normalizeAppointmentStatus('PENDING')).toBe('PENDING');
    expect(normalizeAppointmentStatus('SCHEDULED')).toBe('SCHEDULED');
    expect(normalizeAppointmentStatus('CONFIRMED')).toBe('CONFIRMED');
    expect(normalizeAppointmentStatus('CANCELLED')).toBe('CANCELLED');
    expect(normalizeAppointmentStatus('COMPLETED')).toBe('COMPLETED');
  });

  it('falls back to SCHEDULED for missing or unknown statuses', () => {
    expect(normalizeAppointmentStatus(undefined)).toBe('SCHEDULED');
    expect(normalizeAppointmentStatus('UNKNOWN')).toBe('SCHEDULED');
  });

  it('identifies only pending, scheduled and confirmed appointments as active', () => {
    expect(isActiveAppointmentStatus('PENDING')).toBe(true);
    expect(isActiveAppointmentStatus('SCHEDULED')).toBe(true);
    expect(isActiveAppointmentStatus('CONFIRMED')).toBe(true);
    expect(isActiveAppointmentStatus('CANCELLED')).toBe(false);
    expect(isActiveAppointmentStatus('COMPLETED')).toBe(false);
  });
});
