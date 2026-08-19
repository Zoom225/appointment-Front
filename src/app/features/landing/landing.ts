import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Theme } from '../../core/services/theme';

const DEMO_EMAIL = 'demo@gestion-rendez-vous.com';
const DEMO_PASSWORD = 'Demo2026!';
const PROJECT_URL = 'https://gestion-de-rendez-vous.vercel.app';
const FRONTEND_GITHUB_URL = 'https://github.com/Zoom225/appointment-Front';
const BACKEND_GITHUB_URL = 'https://github.com/Zoom225/appointment-Backend';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
  protected readonly theme = inject(Theme);
  protected readonly demoEmail = DEMO_EMAIL;
  protected readonly demoPassword = DEMO_PASSWORD;
  protected readonly projectUrl = PROJECT_URL;
  protected readonly frontendGithubUrl = FRONTEND_GITHUB_URL;
  protected readonly backendGithubUrl = BACKEND_GITHUB_URL;

  protected readonly technologies = [
    'Angular',
    'Spring Boot',
    'Java 21',
    'PostgreSQL',
    'Spring Security',
    'JWT',
    'REST API',
    'Render',
    'Vercel',
    'GitHub',
  ];
}
