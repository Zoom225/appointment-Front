import { HttpErrorResponse } from '@angular/common/http';

export function getApiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Une erreur inattendue est survenue.';
  }

  if (error.status === 0) {
    return 'Impossible de joindre le serveur. Vérifie ta connexion ou la configuration CORS.';
  }

  if (typeof error.error === 'object' && error.error && 'message' in error.error) {
    const message = error.error.message;

    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  if (typeof error.error === 'string' && error.error.trim().length > 0) {
    return error.error;
  }

  switch (error.status) {
    case 400:
      return 'Requête invalide. Vérifie les informations envoyées.';
    case 401:
      return 'Email ou mot de passe incorrect.';
    case 403:
      return 'Accès interdit.';
    case 404:
      return 'Ressource introuvable.';
    case 409:
      return 'Conflit métier détecté. Vérifie les disponibilités ou le statut.';
    case 422:
      return 'Les données envoyées ne respectent pas les règles attendues.';
    case 500:
      return 'Erreur serveur. Réessaie plus tard.';
    default:
      return `Erreur HTTP ${error.status}.`;
  }
}
