import { describe, expect, it } from 'vitest';
import { normalizeAppointmentStatus } from './appointment.models';

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
});
