import { describe, expect, it } from 'vitest';
import { allowedAdminTransitions, appointmentStatusLabel } from './appointment-status';

describe('appointment status helpers', () => {
  it('centralizes French status labels', () => {
    expect(appointmentStatusLabel('PENDING')).toBe('En attente');
    expect(appointmentStatusLabel('CONFIRMED')).toBe('Confirmé');
  });

  it('only exposes valid admin transitions', () => {
    expect(allowedAdminTransitions('PENDING')).toEqual(['CONFIRMED', 'CANCELLED']);
    expect(allowedAdminTransitions('CONFIRMED')).toEqual(['COMPLETED', 'CANCELLED']);
    expect(allowedAdminTransitions('COMPLETED')).toEqual([]);
  });
});
