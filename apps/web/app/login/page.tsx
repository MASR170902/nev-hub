"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, TOKEN_KEY } from "@/lib/api";
import { User } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "login") {
        const result = await api<{ accessToken: string; user: User }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), password }),
        });
        localStorage.setItem(TOKEN_KEY, result.accessToken);
        router.replace("/dashboard");
      } else {
        const result = await api<{ accessToken: string; user: User }>("/auth/register", {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
        });
        localStorage.setItem(TOKEN_KEY, result.accessToken);
        setSuccess("Pendaftaran berhasil! Mengalihkan ke dashboard...");
        router.replace("/dashboard");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Permintaan gagal diproses.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-art">
        <div className="brand">
          <Image src="/nev-logo.png" width={42} height={42} alt="NEV" />
          <span>NEV<span className="red">Hub</span><small>INTERNAL ACTIVITY MANAGEMENT</small></span>
        </div>
        <div>
          <span className="eyebrow">CONNECT · LEARN · GROW</span>
          <h1>Semua kegiatan.<br />Satu kendali.</h1>
          <p>Kelola agenda organisasi NEVHub, dari perencanaan, pendaftaran, presensi, hingga sertifikat dalam satu portal.</p>
        </div>
        <small>NEVHub · Portal Kegiatan Organisasi</small>
      </section>

      <section className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <span className="eyebrow">{mode === "login" ? "AUTENTIKASI AKUN" : "PENDAFTARAN PESERTA"}</span>
          <h2>{mode === "login" ? "Masuk ke NEVHub" : "Buat Akun Peserta"}</h2>
          <p className="muted">
            {mode === "login"
              ? "Gunakan email atau username/NIM yang terdaftar."
              : "Daftar sebagai peserta untuk mengikuti agenda & kegiatan NEVHub."}
          </p>

          {error && <p className="error" role="alert">{error}</p>}
          {success && <p className="success" role="status" style={{ background: "rgba(24,121,78,0.2)", border: "1px solid #18794e", color: "#4ade80", padding: "8px 12px", borderRadius: 6, fontSize: 13 }}>{success}</p>}

          {mode === "register" && (
            <label className="field">Nama Lengkap
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama lengkap Anda"
                required
                autoComplete="name"
              />
            </label>
          )}

          <label className="field">Email atau NIM / Username
            <input
              type="text"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={mode === "login" ? "Email atau username Anda" : "Email atau NIM Anda"}
              required
              autoComplete="username"
            />
          </label>

          <label className="field">Password
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          <button className="button" disabled={busy}>
            {busy ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar Sekarang"}
          </button>

          {mode === "login" ? (
            <p className="muted" style={{ marginTop: 16, fontSize: 13, textAlign: "center" }}>
              Belum punya akun?{" "}
              <button
                type="button"
                className="text-button"
                style={{ color: "#ef4444", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
              >
                Daftar sebagai peserta
              </button>
            </p>
          ) : (
            <p className="muted" style={{ marginTop: 16, fontSize: 13, textAlign: "center" }}>
              Sudah punya akun?{" "}
              <button
                type="button"
                className="text-button"
                style={{ color: "#ef4444", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
              >
                Masuk ke akun
              </button>
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
