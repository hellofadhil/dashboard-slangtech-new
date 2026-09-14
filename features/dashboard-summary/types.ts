export type DashboardSummary = {
  students: {
    total: number;
    incompleteProfiles: number;
    newThisMonth: number;
  };
  classes: {
    total: number;
    active: number;
    inactive: number;
    featured: number;
    private: number;
    group: number;
  };
  events: {
    total: number;
    active: number;
    inactive: number;
    featured: number;
    free: number;
    paid: number;
    upcoming: number;
  };
  enrollments: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
    newThisMonth: number;
    waitingForSchedule: number;
  };
  payments: {
    total: number;
    unpaid: number;
    pending: number;
    paid: number;
    rejected: number;
    expired: number;
    failed: number;
    cancelled: number;
    refunded: number;
    revenueThisMonth: number;
    paidThisMonth: number;
    pendingManualReview: number;
  };
  schedules: {
    total: number;
    today: number;
    upcomingThisWeek: number;
    completedThisMonth: number;
    cancelledThisMonth: number;
  };
  rescheduleRequests: {
    total: number;
    pending: number;
    approvedThisMonth: number;
    rejectedThisMonth: number;
  };
};

export const emptyDashboardSummary: DashboardSummary = {
  students: {
    total: 0,
    incompleteProfiles: 0,
    newThisMonth: 0,
  },
  classes: {
    total: 0,
    active: 0,
    inactive: 0,
    featured: 0,
    private: 0,
    group: 0,
  },
  events: {
    total: 0,
    active: 0,
    inactive: 0,
    featured: 0,
    free: 0,
    paid: 0,
    upcoming: 0,
  },
  enrollments: {
    total: 0,
    pending: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    newThisMonth: 0,
    waitingForSchedule: 0,
  },
  payments: {
    total: 0,
    unpaid: 0,
    pending: 0,
    paid: 0,
    rejected: 0,
    expired: 0,
    failed: 0,
    cancelled: 0,
    refunded: 0,
    revenueThisMonth: 0,
    paidThisMonth: 0,
    pendingManualReview: 0,
  },
  schedules: {
    total: 0,
    today: 0,
    upcomingThisWeek: 0,
    completedThisMonth: 0,
    cancelledThisMonth: 0,
  },
  rescheduleRequests: {
    total: 0,
    pending: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
  },
};
