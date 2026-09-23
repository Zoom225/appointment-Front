export interface AdminStatistics {
  totalUsers: number;
  activeUsersLast30Days: number;
  totalAppointments: number;
  todayAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  appointmentsInPeriod: number;
  pendingAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  activeSince: string | null;
  periodFrom: string | null;
  periodTo: string | null;
}
