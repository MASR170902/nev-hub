"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { api, logout } from "@/lib/api";
import { Event, Notification, Registration, Role, User, roleNames } from "@/lib/types";

const links: Array<{ href: string; label: string; icon: string; roles?: Role[] }> = [
  { href: "/dashboard", label: "Dashboard", icon: "⌂" },
  { href: "/events", label: "Agenda & acara", icon: "▦" },
  { href: "/registrations", label: "Pendaftaran", icon: "☷" },
  { href: "/calendar", label: "Kalender agenda", icon: "▣" },
  { href: "/attendance", label: "Presensi", icon: "✓", roles: ["SUPER_ADMIN", "ATTENDANCE_OFFICER"] },
  { href: "/committee", label: "Panitia", icon: "♧", roles: ["SUPER_ADMIN", "ADMIN_EVENT", "LEADER"] },
  { href: "/certificates", label: "Sertifikat", icon: "◇", roles: ["SUPER_ADMIN", "ADMIN_EVENT", "PARTICIPANT"] },
  { href: "/finance", label: "Keuangan", icon: "Rp", roles: ["SUPER_ADMIN", "TREASURER"] },
  { href: "/accounts", label: "Akun & role", icon: "♙", roles: ["SUPER_ADMIN"] },
  { href: "/notifications", label: "Notifikasi", icon: "◉" },
  { href: "/audit", label: "Audit log", icon: "≋", roles: ["SUPER_ADMIN"] },
  { href: "/settings", label: "Konfigurasi", icon: "⚙", roles: ["SUPER_ADMIN"] },
];
const dateTime = (value: string) => new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
const date = (value: string) => new Date(value).toLocaleDateString("id-ID", { dateStyle: "medium" });
const localDateTime = (value: string) => {
  const parsed = new Date(value);
  parsed.setMinutes(parsed.getMinutes() - parsed.getTimezoneOffset());
  return parsed.toISOString().slice(0, 16);
};

export function Workspace({ section, children }: { section: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<User>("/auth/me").then(setUser).catch(() => logout()).finally(() => setLoading(false));
  }, []);
  if (loading) return <main className="content"><p className="muted">Memuat workspace…</p></main>;
  if (!user) return null;
  const available = links.filter((item) => !item.roles || item.roles.includes(user.role));
  return <div className="shell">
    <aside className="sidebar">
      <Link className="brand" href="/dashboard"><Image src="/nev-logo.png" width={39} height={39} alt="NEV" /><span>NEV<span className="red">Hub</span><small>ACTIVITY WORKSPACE</small></span></Link>
      <div className="nav-label">Menu utama</div>
      <nav className="nav-list">{available.map((item) => <Link key={item.href} href={item.href} className={`nav-link ${pathname === item.href ? "active" : ""}`}><span>{item.icon}</span>{item.label}</Link>)}</nav>
      <div className="sidebar-bottom">Akses jaringan internal<br />NEVHub · v1.0 MVP</div>
    </aside>
    <main className="main">
      <header className="topbar"><strong>{section}</strong><div className="user-chip"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span>{user.name}<small>{roleNames[user.role]}</small></span><button className="button secondary" onClick={() => logout()}>Keluar</button></div></header>
      <div className="content">{children}</div>
    </main>
  </div>;
}

function Heading({ eyebrow = "WORKSPACE", title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p className="muted">{description}</p>}</div>{action}</div>;
}

function useData<T>(path: string) {
  const [data, setData] = useState<T[]>([]);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    api<T[]>(path).then(setData).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Data gagal dimuat."));
  }, [path, reload]);
  return { data, error, refresh: () => setReload((value) => value + 1) };
}

function Feedback({ error, message }: { error: string; message: string }) {
  return <>{error && <p className="error" role="alert">{error}</p>}{message && <p className="success" role="status">{message}</p>}</>;
}

export function DashboardPage() {
  const { data: events } = useData<Event>("/events");
  const { data: registrations } = useData<Registration>("/registrations/mine");
  const { data: notifications } = useData<Notification>("/notifications");
  const published = events.filter((event) => event.status === "PUBLISHED");
  return <>
    <Heading eyebrow="NEVHUB CONTROL CENTER" title="Ringkasan kegiatan" description="Pantau agenda organisasi dari perencanaan hingga pelaporan." />
    <div className="metric-grid">
      <Metric label="Agenda aktif" value={published.length} note="Agenda yang dipublikasikan" />
      <Metric label="Pendaftaran saya" value={registrations.length} note="Semua status pendaftaran" />
      <Metric label="Notifikasi belum dibaca" value={notifications.filter((item) => !item.readAt).length} note="Pembaruan terbaru" />
      <Metric label="Bulan ini" value={published.filter((event) => new Date(event.startsAt).getMonth() === new Date().getMonth()).length} note="Agenda pada bulan berjalan" />
    </div>
    <section className="card"><div className="card-head"><h2>Agenda terdekat</h2><Link className="button secondary" href="/events">Lihat semua</Link></div><EventCards events={published.slice(0, 4)} /></section>
  </>;
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return <div className="metric"><span>{label}</span><b>{value}</b><small>{note}</small></div>;
}

function EventCards({ events }: { events: Event[] }) {
  if (!events.length) return <div className="empty">Belum ada agenda. Admin Event dapat membuat agenda baru dari halaman Agenda &amp; acara.</div>;
  return <div className="event-grid">{events.map((event) => <article className="event-card" key={event.id}><span className="badge red">{event.status}</span><h3>{event.title}</h3><p>{event.description}</p><div className="event-meta"><span>{dateTime(event.startsAt)} – {dateTime(event.endsAt)}</span><span>{event.location}</span><span>{event._count?.registrations ?? 0} pendaftar</span></div>{Array.isArray(event.rundown) && event.rundown.length > 0 && <details><summary>Detail rundown</summary><pre style={{ whiteSpace: "pre-wrap", fontSize: 10 }}>{JSON.stringify(event.rundown, null, 2)}</pre></details>}</article>)}</div>;
}

function AgendaTimeline({ events }: { events: Event[] }) {
  if (!events.length) return <div className="empty">Belum ada agenda yang dijadwalkan.</div>;
  const groups = events.reduce<Record<string, Event[]>>((result, event) => {
    const month = new Date(event.startsAt).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    (result[month] ??= []).push(event);
    return result;
  }, {});
  return <div className="stack">{Object.entries(groups).map(([month, items]) => <section className="card" key={month}><h2>{month}</h2><div className="stack">{items.map((event) => <article className="event-card" key={event.id}><div className="event-meta"><span>{dateTime(event.startsAt)} – {dateTime(event.endsAt)}</span><span>{event.location}</span><span>{event.status}</span></div><h3>{event.title}</h3><p>{event.description}</p>{Array.isArray(event.rundown) && event.rundown.length > 0 && <details><summary>Lihat rundown</summary><pre style={{ whiteSpace: "pre-wrap", fontSize: 10 }}>{JSON.stringify(event.rundown, null, 2)}</pre></details>}</article>)}</div></section>)}</div>;
}

function AdminEventCards({ events, onRefresh, onMessage }: { events: Event[]; onRefresh: () => void; onMessage: (message: string) => void }) {
  async function save(id: string, formElement: HTMLFormElement) {
    const form = new FormData(formElement);
    try {
      await api(`/events/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          location: form.get("location"),
          startsAt: new Date(String(form.get("startsAt"))).toISOString(),
          endsAt: new Date(String(form.get("endsAt"))).toISOString(),
          capacity: Number(form.get("capacity")) || null,
          status: form.get("status"),
          rundown: form.get("rundown") ? JSON.parse(String(form.get("rundown"))) : [],
        }),
      });
      onMessage("Agenda berhasil diperbarui.");
      onRefresh();
    } catch (cause) {
      onMessage(cause instanceof Error ? cause.message : "Agenda gagal diperbarui.");
    }
  }
  async function remove(id: string) {
    if (!window.confirm("Batalkan agenda ini? Riwayat pendaftaran dan presensi tetap disimpan.")) return;
    try {
      await api(`/events/${id}`, { method: "DELETE" });
      onMessage("Agenda berhasil dibatalkan; riwayat tetap tersimpan.");
      onRefresh();
    } catch (cause) {
      onMessage(cause instanceof Error ? cause.message : "Agenda gagal dibatalkan.");
    }
  }
  return <div className="stack">{events.map((event) => <article className="card stack" key={event.id}>
    <div className="card-head"><div><span className="badge red">{event.status}</span><h2 style={{ marginTop: 10 }}>{event.title}</h2></div>{event.status !== "CANCELLED" && <button className="button secondary" onClick={() => void remove(event.id)}>Batalkan agenda</button>}</div>
    <p className="muted">{dateTime(event.startsAt)} – {dateTime(event.endsAt)} · {event.location} · {event._count?.registrations ?? 0} pendaftar</p>
    <details><summary>Edit detail dan rundown</summary>
      <form className="stack" style={{ marginTop: 14 }} onSubmit={(submitEvent) => { submitEvent.preventDefault(); void save(event.id, submitEvent.currentTarget); }}>
        <div className="field-grid">
          <label className="field">Nama agenda<input name="title" defaultValue={event.title} required /></label>
          <label className="field">Lokasi<input name="location" defaultValue={event.location} required /></label>
          <label className="field">Tanggal &amp; waktu mulai<input name="startsAt" type="datetime-local" defaultValue={localDateTime(event.startsAt)} required /></label>
          <label className="field">Tanggal &amp; waktu berakhir<input name="endsAt" type="datetime-local" defaultValue={localDateTime(event.endsAt)} required /></label>
          <label className="field">Kapasitas<input name="capacity" type="number" min="1" defaultValue={event.capacity ?? ""} /></label>
          <label className="field">Status<select name="status" defaultValue={event.status}><option value="DRAFT">Draft</option><option value="PUBLISHED">Publikasikan</option><option value="CANCELLED">Dibatalkan</option><option value="COMPLETED">Selesai</option></select></label>
          <label className="field full">Deskripsi<textarea name="description" rows={3} defaultValue={event.description} required /></label>
          <label className="field full">Rundown (JSON)<textarea name="rundown" rows={4} defaultValue={JSON.stringify(event.rundown ?? [], null, 2)} /></label>
        </div>
        <div className="form-actions"><button className="button">Simpan perubahan</button></div>
      </form>
    </details>
  </article>)}</div>;
}

export function EventsPage({ calendar = false }: { calendar?: boolean }) {
  const { data: events, error, refresh } = useData<Event>("/events");
  const [user, setUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { api<User>("/auth/me").then(setUser).catch(() => undefined); }, []);
  const canManage = user && ["SUPER_ADMIN", "ADMIN_EVENT"].includes(user.role);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api<Event>("/events", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          location: form.get("location"),
          startsAt: new Date(String(form.get("startsAt"))).toISOString(),
          endsAt: new Date(String(form.get("endsAt"))).toISOString(),
          capacity: Number(form.get("capacity")) || undefined,
          status: form.get("status"),
          rundown: form.get("rundown") ? JSON.parse(String(form.get("rundown"))) : [],
        }),
      });
      setMessage("Agenda berhasil disimpan.");
      setErrorMessage("");
      formElement.reset();
      refresh();
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : "Agenda gagal disimpan.");
    }
  }
  async function register(eventId: string) {
    try {
      await api("/registrations", { method: "POST", body: JSON.stringify({ eventId }) });
      setMessage("Pendaftaran berhasil dikirim.");
      setErrorMessage("");
      refresh();
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : "Pendaftaran gagal.");
    }
  }
  return <>
    <Heading eyebrow={calendar ? "AGENDA ORGANISASI" : "EVENT MANAGEMENT"} title={calendar ? "Kalender agenda" : "Agenda & acara"} description={calendar ? "Jadwal mulai dan selesai agenda organisasi." : "Rencanakan, publikasikan, dan kelola acara NEVHub."} />
    {canManage && !calendar && <form className="card stack" onSubmit={create}><h2>Buat agenda baru</h2><Feedback error={errorMessage} message={message} /><div className="field-grid">
      <label className="field">Nama agenda<input name="title" required /></label><label className="field">Lokasi<input name="location" required /></label>
      <label className="field">Tanggal &amp; waktu mulai<input name="startsAt" type="datetime-local" required /></label><label className="field">Tanggal &amp; waktu berakhir<input name="endsAt" type="datetime-local" required /></label>
      <label className="field">Kapasitas peserta (opsional)<input name="capacity" type="number" min="1" /></label><label className="field">Status<select name="status"><option value="DRAFT">Draft</option><option value="PUBLISHED">Publikasikan</option></select></label>
      <label className="field full">Deskripsi<textarea name="description" rows={3} required /></label>
      <label className="field full">Rundown (JSON, opsional)<textarea name="rundown" rows={3} placeholder={'[{"time":"09:00","activity":"Pembukaan"}]'} /></label>
    </div><div className="form-actions"><button className="button">Simpan agenda</button></div></form>}
    <div style={{ height: 18 }} /><Feedback error={error} message="" />
    {user?.role === "PARTICIPANT" && !calendar
      ? <ParticipantEventList events={events.filter((event) => event.status === "PUBLISHED")} onRegister={register} />
      : canManage && !calendar
        ? <AdminEventCards events={[...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt))} onRefresh={refresh} onMessage={setMessage} />
        : calendar
          ? <AgendaTimeline events={[...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt))} />
          : <EventCards events={[...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt))} />}
  </>;
}

function ParticipantEventList({ events, onRegister }: { events: Event[]; onRegister: (id: string) => void }) {
  const { data: registrations } = useData<Registration>("/registrations/mine");
  const registered = new Set(registrations.map((item) => item.event.id));
  return <div className="event-grid">{events.map((event) => <article className="event-card" key={event.id}><span className="badge red">PENDAFTARAN</span><h3>{event.title}</h3><p>{event.description}</p><div className="event-meta"><span>{dateTime(event.startsAt)} – {dateTime(event.endsAt)}</span><span>{event.location}</span></div><button className="button" disabled={registered.has(event.id)} onClick={() => onRegister(event.id)}>{registered.has(event.id) ? "Sudah terdaftar" : "Daftar kegiatan"}</button></article>)}</div>;
}

export function RegistrationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [eventId, setEventId] = useState("");
  useEffect(() => { api<User>("/auth/me").then(setUser).catch(() => undefined); }, []);
  const { data, error } = useData<Registration>("/registrations/mine");
  const canReview = user && ["SUPER_ADMIN", "ADMIN_EVENT"].includes(user.role);
  return <><Heading title={canReview ? "Registrasi & seleksi" : "Pendaftaran saya"} description={canReview ? "Tinjau peserta per agenda dan tetapkan keputusan seleksi." : "Pantau keputusan, presensi, dan sertifikat kegiatan."} />
    {canReview && <form className="card" onSubmit={(event) => { event.preventDefault(); setEventId(String(new FormData(event.currentTarget).get("eventId"))); }}><div className="field-grid"><label className="field">ID agenda untuk ditinjau<input name="eventId" required /></label><div className="field" style={{ alignContent: "end" }}><button className="button">Muat peserta</button></div></div></form>}
    <Feedback error={error} message="" />
    {canReview && eventId ? <RegistrationReview eventId={eventId} /> : <div className="card"><DataTable headers={["Agenda", "Waktu daftar", "Status", "Presensi", "Sertifikat"]} rows={data.map((item) => [item.event.title, dateTime(item.registeredAt), item.status, item.attendance ? "Hadir" : "Belum", item.certificate?.serialNumber ?? "—"])} /></div>}
  </>;
}

function RegistrationReview({ eventId }: { eventId: string }) {
  const { data, error, refresh } = useData<Registration>(`/registrations/event/${encodeURIComponent(eventId)}`);
  const [message, setMessage] = useState("");
  async function review(id: string, status: "APPROVED" | "REJECTED" | "WAITLISTED") {
    try {
      await api(`/registrations/${id}/review`, { method: "PUT", body: JSON.stringify({ status }) });
      setMessage("Keputusan seleksi tersimpan dan peserta diberi notifikasi.");
      refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Keputusan gagal disimpan.");
    }
  }
  return <section className="card"><h2>Daftar peserta</h2><Feedback error={error} message={message} />{data.map((item) => <div className="event-card" key={item.id} style={{ marginBottom: 9, gridTemplateColumns: "1fr auto", alignItems: "center" }}><div><strong>{item.user?.name}</strong><p>{item.user?.email} · {item.status}</p></div><div className="form-actions" style={{ margin: 0 }}>{(["APPROVED", "WAITLISTED", "REJECTED"] as const).map((status) => <button key={status} type="button" className="button secondary" onClick={() => review(item.id, status)}>{status === "APPROVED" ? "Setujui" : status === "WAITLISTED" ? "Daftar tunggu" : "Tolak"}</button>)}</div></div>)}</section>;
}

export function AttendancePage() {
  const { data, error, refresh } = useData<Record<string, unknown>>("/attendance");
  const [feedback, setFeedback] = useState("");
  async function checkIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api("/attendance/check-in", { method: "POST", body: JSON.stringify({ registrationId: form.get("registrationId"), status: form.get("status") }) });
      setFeedback("Presensi berhasil dicatat.");
      formElement.reset();
      refresh();
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "Presensi gagal.");
    }
  }
  return <><Heading title="Presensi & check-in" description="Pindai QR dengan barcode scanner USB atau masukkan ID pendaftaran peserta." /><form className="card stack" onSubmit={checkIn}><h2>Check-in peserta</h2><Feedback error={error} message={feedback} /><div className="field-grid"><label className="field">ID pendaftaran / hasil scan QR<input name="registrationId" required autoFocus /></label><label className="field">Status<select name="status"><option value="PRESENT">Hadir</option><option value="LATE">Terlambat</option><option value="EXCUSED">Izin</option></select></label></div><p className="muted" style={{ fontSize: 11 }}>Scanner QR USB yang berfungsi sebagai keyboard dapat langsung mengisi kolom ini. Akses kamera browser di jaringan LAN memerlukan HTTPS.</p><div className="form-actions"><button className="button">Catat presensi</button></div></form><div style={{ height: 16 }} /><section className="card"><h2>Riwayat presensi</h2><DataTable headers={["Peserta", "Agenda", "Status", "Waktu"]} rows={data.map((item) => [String((item.registration as { user?: User })?.user?.name ?? "Peserta"), String((item.event as Event)?.title ?? "Agenda"), String(item.status), dateTime(String(item.checkedInAt))])} /></section></>;
}

export function GenericPage({ section }: { section: string }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => { api<User>("/auth/me").then(setUser).catch(() => undefined); }, []);
  const paths: Record<string, { title: string; description: string; api: string; headers: string[]; map: (row: Record<string, unknown>) => string[] }> = {
    committee: { title: "Manajemen panitia", description: "Atur penanggung jawab serta pembagian posisi tiap agenda.", api: "/events", headers: ["Agenda", "Mulai", "Selesai", "Penanggung jawab"], map: (row) => [String(row.title), dateTime(String(row.startsAt)), dateTime(String(row.endsAt)), "Kelola dari detail agenda"] },
    certificates: { title: "Sertifikat", description: "Terbitkan nomor sertifikat untuk peserta yang disetujui.", api: "/certificates", headers: ["Nomor sertifikat", "Agenda", "Nama", "Tanggal terbit"], map: (row) => [String(row.serialNumber), String((row.event as Event)?.title), String((row.user as User)?.name), dateTime(String(row.issuedAt))] },
    finance: { title: "Keuangan", description: "Catat dan pantau pemasukan serta pengeluaran kegiatan.", api: "/finance/transactions", headers: ["Tipe", "Jumlah", "Keterangan", "Tanggal"], map: (row) => [String(row.type), `Rp ${Number(row.amount).toLocaleString("id-ID")}`, String(row.description), dateTime(String(row.occurredAt))] },
    accounts: { title: "Manajemen akun & role", description: "Akun internal dibuat oleh Super Admin dengan hak akses sesuai tanggung jawab.", api: "/accounts", headers: ["Nama", "Email", "Role", "Status"], map: (row) => [String(row.name), String(row.email), String(row.role), row.active ? "Aktif" : "Nonaktif"] },
    audit: { title: "Audit log", description: "Riwayat perubahan dan aktivitas pada sistem NEVHub.", api: "/audit", headers: ["Waktu", "Pengguna", "Aksi", "Objek"], map: (row) => [dateTime(String(row.createdAt)), String((row.actor as User)?.name ?? "Sistem"), String(row.action), `${String(row.entityType)} ${String(row.entityId ?? "")}`] },
    notifications: { title: "Notifikasi", description: "Pembaruan pendaftaran, agenda, dan sertifikat.", api: "/notifications", headers: ["Judul", "Pesan", "Diterima", "Status"], map: (row) => [String(row.title), String(row.message), dateTime(String(row.createdAt)), row.readAt ? "Dibaca" : "Baru"] },
    settings: { title: "Konfigurasi sistem", description: "Kelola konfigurasi non-rahasia NEVHub. Password, JWT secret, dan koneksi database tidak dapat dibaca dari halaman ini.", api: "/settings", headers: ["Kunci", "Nilai", "Diperbarui"], map: (row) => [String(row.key), String(row.value), dateTime(String(row.updatedAt))] },
  };
  const config = paths[section];
  const { data, refresh } = useData<Record<string, unknown>>(config?.api ?? "/events");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    let path = "";
    let body: Record<string, unknown> = {};
    if (section === "accounts") {
      path = "/accounts";
      body = { name: form.get("name"), email: form.get("email"), role: form.get("role"), password: form.get("password") };
    } else if (section === "finance") {
      path = "/finance/transactions";
      body = { type: form.get("type"), amount: Number(form.get("amount")), description: form.get("description"), reference: form.get("reference") || undefined };
    } else if (section === "committee") {
      path = "/committee";
      body = { eventId: form.get("eventId"), userId: form.get("userId"), position: form.get("position") };
    } else if (section === "certificates") {
      path = "/certificates";
      body = { registrationId: form.get("registrationId"), serialNumber: form.get("serialNumber") };
    } else if (section === "settings") {
      path = `/settings/${encodeURIComponent(String(form.get("key")))}`;
      body = { value: form.get("value") };
    } else return;
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      setMessage("Data berhasil disimpan.");
      setError("");
      formElement.reset();
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Data gagal disimpan.");
    }
  }
  if (!config) return <><Heading title="Halaman tidak ditemukan" /><div className="empty">Menu tidak tersedia untuk akun ini.</div></>;
  const formAllowed =
    section === "settings" || section === "accounts"
      ? user?.role === "SUPER_ADMIN"
      : section === "finance"
        ? user?.role === "SUPER_ADMIN" || user?.role === "TREASURER"
        : section === "committee"
          ? ["SUPER_ADMIN", "ADMIN_EVENT"].includes(user?.role ?? "")
          : section === "certificates"
            ? ["SUPER_ADMIN", "ADMIN_EVENT"].includes(user?.role ?? "")
            : false;
  return <><Heading title={config.title} description={config.description} /><Feedback error={error} message={message} />
    {formAllowed && <form className="card stack" onSubmit={submit}><h2>{section === "accounts" ? "Buat akun internal" : section === "finance" ? "Catat transaksi" : section === "committee" ? "Tetapkan panitia" : section === "settings" ? "Simpan konfigurasi" : "Terbitkan sertifikat"}</h2><div className="field-grid">
      {section === "accounts" && <><label className="field">Nama<input name="name" required /></label><label className="field">Email<input name="email" type="email" required /></label><label className="field">Password awal (min. 12 karakter)<input name="password" type="password" minLength={12} required /></label><label className="field">Role<select name="role">{(["ADMIN_EVENT", "ATTENDANCE_OFFICER", "TREASURER", "LEADER", "COMMITTEE", "PARTICIPANT"] as Role[]).map((role) => <option key={role} value={role}>{roleNames[role]}</option>)}</select></label></>}
      {section === "finance" && <><label className="field">Jenis transaksi<select name="type"><option value="INCOME">Pemasukan</option><option value="EXPENSE">Pengeluaran</option></select></label><label className="field">Jumlah (Rp)<input name="amount" type="number" min="0.01" step="0.01" required /></label><label className="field">Keterangan<input name="description" required /></label><label className="field">Referensi<input name="reference" /></label></>}
      {section === "committee" && <><label className="field">ID agenda<input name="eventId" required /></label><label className="field">ID akun panitia<input name="userId" required /></label><label className="field">Posisi<input name="position" required /></label></>}
      {section === "certificates" && <><label className="field">ID pendaftaran disetujui<input name="registrationId" required /></label><label className="field">Nomor sertifikat<input name="serialNumber" required /></label></>}
      {section === "settings" && <><label className="field">Kunci<input name="key" required pattern="[a-zA-Z0-9._-]+" /></label><label className="field">Nilai<textarea name="value" required /></label></>}
    </div><div className="form-actions"><button className="button">Simpan</button></div></form>}
    <div style={{ height: 16 }} />{section === "accounts"
      ? <AccountManager accounts={data} onRefresh={refresh} />
      : <section className="card"><DataTable headers={config.headers} rows={data.map(config.map)} /></section>}
    {section === "notifications" && <p className="muted" style={{ fontSize: 11 }}>Pengiriman email dapat dihubungkan setelah konfigurasi SMTP organisasi tersedia. MVP menyimpan notifikasi di dalam aplikasi.</p>}
  </>;
}

function AccountManager({ accounts, onRefresh }: { accounts: Record<string, unknown>[]; onRefresh: () => void }) {
  const [feedback, setFeedback] = useState("");
  async function update(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      if (values.get("newPassword")) {
        await api(`/accounts/${id}/reset-password`, {
          method: "POST",
          body: JSON.stringify({ newPassword: values.get("newPassword") }),
        });
      }
      await api(`/accounts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: values.get("role"), active: values.get("active") === "on" }),
      });
      setFeedback("Perubahan akun berhasil disimpan. Password disimpan dalam bentuk hash bcrypt.");
      form.reset();
      onRefresh();
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "Perubahan akun gagal.");
    }
  }
  return <section className="card stack"><h2>Akun, role &amp; reset password</h2>{feedback && <p className="success">{feedback}</p>}
    {!accounts.length && <div className="empty">Belum ada akun.</div>}
    {accounts.map((account) => <form className="event-card" key={String(account.id)} onSubmit={(event) => void update(event, String(account.id))}>
      <div><strong>{String(account.name)}</strong><p>{String(account.email)} · {account.active ? "Aktif" : "Nonaktif"}</p></div>
      <div className="field-grid">
        <label className="field">Role<select name="role" defaultValue={String(account.role)}>{Object.entries(roleNames).map(([role, name]) => <option key={role} value={role}>{name}</option>)}</select></label>
        <label className="field">Password baru (opsional, min. 12 karakter)<input name="newPassword" type="password" minLength={12} autoComplete="new-password" /></label>
        <label className="field"><span>Status akun</span><select name="active" defaultValue={account.active ? "on" : "off"}><option value="on">Aktif</option><option value="off">Nonaktif</option></select></label>
      </div>
      <div className="form-actions"><button className="button secondary">Simpan role / reset password</button></div>
    </form>)}
  </section>;
}

export function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (!rows.length) return <div className="empty">Belum ada data.</div>;
  return <div className="table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
