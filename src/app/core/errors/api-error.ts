import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  validationErrors?: Record<string, string>;
}

export interface ApiErrorDetails {
  message: string;
  validationErrors: Record<string, string>;
}

export interface ApiErrorMessageOptions {
  unauthorizedMessage?: string;
}

const UNEXPECTED_ERROR_MESSAGE = 'Une erreur inattendue est survenue.';

export function getApiErrorDetails(error: unknown, options: ApiErrorMessageOptions = {}): ApiErrorDetails {
  if (error instanceof TimeoutError) {
    return { message: 'La connexion prend plus de temps que prévu.', validationErrors: {} };
  }

  if (!(error instanceof HttpErrorResponse)) {
    return { message: UNEXPECTED_ERROR_MESSAGE, validationErrors: {} };
  }

  if (error.status === 0) {
    return {
      message: 'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.',
      validationErrors: {},
    };
  }

  const payload = parseErrorPayload(error.error);
  const validationErrors = extractValidationErrors(payload);

  if (error.status === 401 && options.unauthorizedMessage) {
    return { message: options.unauthorizedMessage, validationErrors };
  }

  const backendMessage = extractNonEmptyString(payload, 'message');

  if (backendMessage) {
    return { message: backendMessage, validationErrors };
  }

  if (typeof payload === 'string' && payload.trim()) {
    return { message: payload.trim(), validationErrors };
  }

  return { message: getStatusFallback(error.status), validationErrors };
}

export function getApiErrorMessage(error: unknown, options: ApiErrorMessageOptions = {}): string {
  return getApiErrorDetails(error, options).message;
}

export function getApiValidationErrors(error: unknown): Record<string, string> {
  return getApiErrorDetails(error).validationErrors;
}

function parseErrorPayload(payload: unknown): unknown {
  if (typeof payload !== 'string') {
    return payload;
  }

  const trimmedPayload = payload.trim();

  if (!trimmedPayload) {
    return '';
  }

  try {
    return JSON.parse(trimmedPayload) as unknown;
  } catch {
    return trimmedPayload;
  }
}

function extractValidationErrors(payload: unknown): Record<string, string> {
  if (!isRecord(payload) || !isRecord(payload['validationErrors'])) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(payload['validationErrors']).flatMap(([field, value]) => {
      if (typeof value === 'string' && value.trim()) {
        return [[field, value.trim()]];
      }

      if (Array.isArray(value)) {
        const messages = value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
        return messages.length ? [[field, messages.join(' ')]] : [];
      }

      return [];
    }),
  );
}

function extractNonEmptyString(value: unknown, key: string): string | null {
  if (!isRecord(value) || typeof value[key] !== 'string') {
    return null;
  }

  const message = value[key].trim();
  return message || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStatusFallback(status: number): string {
  switch (status) {
    case 400:
      return 'Requête invalide. Vérifiez les informations envoyées.';
    case 401:
      return 'Authentification requise.';
    case 403:
      return 'Accès interdit.';
    case 404:
      return 'Ressource introuvable.';
    case 409:
      return 'Un conflit empêche cette opération.';
    case 422:
      return 'Les données envoyées ne respectent pas les règles attendues.';
    case 500:
      return 'Erreur interne du serveur.';
    default:
      return status > 0 ? `Erreur HTTP ${status}.` : UNEXPECTED_ERROR_MESSAGE;
  }
}
