import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { getApiErrorDetails, getApiErrorMessage, getApiValidationErrors } from './api-error';

describe('API error helpers', () => {
  it('extracts the backend message and validation errors', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        timestamp: '2026-09-22T10:00:00Z',
        status: 400,
        error: 'Bad Request',
        message: 'Erreur de validation',
        path: '/api/users',
        validationErrors: { email: 'Adresse email invalide' },
      },
    });

    expect(getApiErrorDetails(error)).toEqual({
      message: 'Erreur de validation',
      validationErrors: { email: 'Adresse email invalide' },
    });
    expect(getApiValidationErrors(error)).toEqual({ email: 'Adresse email invalide' });
  });

  it('handles network errors', () => {
    const error = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });

    expect(getApiErrorMessage(error)).toContain('Impossible de joindre le serveur');
  });

  it('handles a non-JSON response', () => {
    const error = new HttpErrorResponse({ status: 502, error: 'Service temporairement indisponible' });

    expect(getApiErrorMessage(error)).toBe('Service temporairement indisponible');
  });

  it('handles an unexpected error value', () => {
    expect(getApiErrorMessage(new Error('unexpected'))).toBe('Une erreur inattendue est survenue.');
  });

  it('can provide a context-specific unauthorized message', () => {
    const error = new HttpErrorResponse({ status: 401, error: { message: 'Unauthorized' } });

    expect(getApiErrorMessage(error, { unauthorizedMessage: 'Email ou mot de passe incorrect' })).toBe(
      'Email ou mot de passe incorrect',
    );
  });
});
