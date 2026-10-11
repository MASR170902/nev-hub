export type Role =
  | "SUPER_ADMIN"
  | "ADMIN_EVENT"
  | "ATTENDANCE_OFFICER"
  | "TREASURER"
  | "LEADER"
  | "COMMITTEE"
  | "PARTICIPANT";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  status: string;
  capacity: number | null;
  rundown: unknown;
  _count?: { registrations: number };
}

export interface Registration {
  id: string;
  status: string;
  registeredAt: string;
  event: Event;
  user?: Pick<User, "id" | "name" | "email">;
  attendance?: unknown;
  certificate?: { serialNumber: string } | null;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export const roleNames: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN_EVENT: "Admin Event",
  ATTENDANCE_OFFICER: "Petugas Presensi",
  TREASURER: "Bendahara",
  LEADER: "Pimpinan",
  COMMITTEE: "Panitia",
  PARTICIPANT: "Peserta",
};
