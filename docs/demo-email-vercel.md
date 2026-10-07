# Email de confirmation en mode démo

Une réservation démo est enregistrée localement avec le statut `CONFIRMED` avant l'appel à `/api/demo/send-confirmation`. La Function Node envoie ensuite un email à l'adresse indiquée dans le formulaire. Une erreur d'envoi ne modifie pas la réservation locale. Le mode réel continue d'utiliser Spring Boot et n'appelle pas cette Function.

Configurer les variables suivantes dans les paramètres du projet Vercel. Elles sont lues uniquement côté serveur et ne doivent pas être ajoutées aux fichiers Angular ni au dépôt :

- `DEMO_MAIL_ENABLED`
- `DEMO_MAIL_FROM`
- `DEMO_SMTP_HOST`
- `DEMO_SMTP_PORT`
- `DEMO_SMTP_USERNAME`
- `DEMO_SMTP_PASSWORD`

Quand `DEMO_MAIL_ENABLED` n'est pas activé, l'API retourne `MAIL_DISABLED` sans contacter SMTP. Le fallback SPA de `vercel.json` reste inchangé.
