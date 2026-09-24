import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { Theme } from '../../core/services/theme';

@Component({ selector: 'app-landing', imports: [RouterLink], templateUrl: './landing.html', styleUrl: './landing.css' })
export class Landing {
  protected readonly auth = inject(Auth);
  protected readonly theme = inject(Theme);
  protected readonly authenticatedDestination = computed(() => this.auth.hasAnyRole(['ADMIN']) ? '/admin' : '/dashboard');
  protected readonly authenticatedLabel = computed(() => this.auth.hasAnyRole(['ADMIN']) ? "Accéder à l'administration" : 'Accéder à mon espace');
  protected readonly demoFeatures = ['Choisir un créneau disponible', 'Prendre un rendez-vous', 'Consulter ses rendez-vous', 'Modifier un rendez-vous actif', 'Annuler un rendez-vous', 'Consulter son historique', 'Recevoir ses notifications'];
  protected readonly adminFeatures = ['Tableau de bord et rendez-vous du jour', 'Confirmer les demandes', 'Terminer ou annuler un rendez-vous', "Consulter l'historique et l'audit", 'Gérer les utilisateurs', 'Voir les notifications'];
  protected readonly technologies = ['Angular', 'Spring Boot', 'Java', 'PostgreSQL', 'JWT'];
}
