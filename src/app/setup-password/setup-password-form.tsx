"use client";

import {
  FormEvent,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Props = {
  email: string;
  nextPath: string;
};

export function SetupPasswordForm({
  email,
  nextPath,
}: Props) {
  const [password, setPassword] =
    useState("");

  const [
    confirmation,
    setConfirmation,
  ] = useState("");

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (password.length < 8) {
      setError(
        "Password minimal 8 karakter."
      );

      return;
    }

    if (password !== confirmation) {
      setError(
        "Konfirmasi password tidak sama."
      );

      return;
    }

    setBusy(true);

    try {
      const supabase =
        createClient();

      /*
       * Pastikan session dari invite
       * masih valid.
       */
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Sesi invite sudah tidak valid. Silakan minta undangan baru."
        );
      }

      /*
       * User sudah authenticated setelah
       * callback invite, jadi password bisa
       * dibuat dengan updateUser().
       */
      const {
        error: updateError,
      } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);

      /*
       * Sedikit jeda agar user melihat
       * bahwa password berhasil dibuat.
       */
      window.setTimeout(() => {
        window.location.href =
          nextPath;
      }, 800);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuat password."
      );
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="callout">
        Password berhasil dibuat.
        Mengarahkan ke dashboard…
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div
        className="callout"
        style={{
          marginBottom: 18,
        }}
      >
        Akun
        <strong>
          {" "}
          {email}
        </strong>{" "}
        sudah diverifikasi. Buat password
        untuk menyelesaikan aktivasi akun.
      </div>

      <div className="field">
        <label>Password baru</label>

        <input
          className="input"
          type="password"
          value={password}
          onChange={(event) =>
            setPassword(
              event.target.value
            )
          }
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          required
          minLength={8}
        />
      </div>

      <div className="field">
        <label>
          Ulangi password
        </label>

        <input
          className="input"
          type="password"
          value={confirmation}
          onChange={(event) =>
            setConfirmation(
              event.target.value
            )
          }
          autoComplete="new-password"
          placeholder="Ulangi password"
          required
          minLength={8}
        />
      </div>

      {error && (
        <div
          className="callout warning"
          style={{
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      <button
        className="btn primary"
        type="submit"
        disabled={busy}
      >
        {busy
          ? "Menyimpan…"
          : "Buat password & lanjut"}
      </button>
    </form>
  );
}
