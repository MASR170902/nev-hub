export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN_EVENT = "ADMIN_EVENT",
  ATTENDANCE_OFFICER = "ATTENDANCE_OFFICER",
  TREASURER = "TREASURER",
  LEADER = "LEADER",
  COMMITTEE = "COMMITTEE",
  PARTICIPANT = "PARTICIPANT",
}

export enum EventStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
}

export enum RegistrationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  WAITLISTED = "WAITLISTED",
  CANCELLED = "CANCELLED",
}

export enum AttendanceStatus {
  PRESENT = "PRESENT",
  LATE = "LATE",
  EXCUSED = "EXCUSED",
}

export enum FinanceType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
}

export enum NotificationChannel {
  IN_APP = "IN_APP",
  EMAIL = "EMAIL",
}

