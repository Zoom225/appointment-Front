import { describe, expect, it } from 'vitest';
import { normalizeAppointmentStatus } from './appointment.models';

describe('appointment models', () => {
  it('normalizes backend appointment statuses to frontend statuses', () => {
    expect(normalizeAppointmentStatus('SCHEDULED')).toBe('scheduled');
    expect(normalizeAppointmentStatus('CONFIRMED')).toBe('confirmed');
    expect(normalizeAppointmentStatus('CANCELLED')).toBe('cancelled');
    expect(normalizeAppointmentStatus('COMPLETED')).toBe('completed');
  });

  it('keeps already normalized frontend statuses unchanged', () => {
    expect(normalizeAppointmentStatus('scheduled')).toBe('scheduled');
    expect(normalizeAppointmentStatus('confirmed')).toBe('confirmed');
    expect(normalizeAppointmentStatus('cancelled')).toBe('cancelled');
    expect(normalizeAppointmentStatus('completed')).toBe('completed');
  });

  it('falls back to scheduled for missing or unknown statuses', () => {
    expect(normalizeAppointmentStatus(undefined)).toBe('scheduled');
    expect(normalizeAppointmentStatus('UNKNOWN')).toBe('scheduled');
  });
});
