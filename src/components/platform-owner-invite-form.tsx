"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field } from "@/components/ui";

type StatusState = {
  kind: "idle" | "busy" | "ok" | "error";
  text: string;
};

export function PlatformOwnerInviteForm({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const router = useRouter();

  const [state, setState] = useState<StatusState>({
    kind: "idle",
    text: "",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    setState({
      kind: "busy",
      text: "",
    });

    try {
      const response = await fetch("/api/admin/invite", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          fullName: form.get("fullName"),
          email: form.get("email"),
          role: form.get("role"),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "Gagal mengundang user"
        );
      }

      setState({
        kind: "ok",
        text: `Undangan berhasil dikirim untuk workspace ${companyName}.`,
      });

      formElement.reset();

      router.refresh();
    } catch (error) {
      setState({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Gagal mengundang user",
      });
    }
  }

  return (
    <form
      className="formgrid"
      onSubmit={submit}
    >
      <Field label="Nama lengkap">
        <input
          name="fullName"
          className="input"
          placeholder="Nama owner"
          required
        />
      </Field>

      <Field label="Email">
        <input
          name="email"
          type="email"
          className="input"
          placeholder="owner@perusahaan.com"
          required
        />
      </Field>

      <Field label="Role" full>
        <select
          name="role"
          className="select"
          defaultValue="owner"
        >
          <option value="owner">
            Company Owner
          </option>

          <option value="hr">
            HR Admin
          </option>
        </select>
      </Field>

      <div className="field full">
        <Button
          variant="primary"
          type="submit"
          disabled={state.kind === "busy"}
        >
          {state.kind === "busy"
            ? "Mengirim undangan…"
            : "Invite Owner / HR"}
        </Button>

        {state.kind !== "idle" && (
          <div
            className={`callout ${
              state.kind === "error"
                ? "warning"
                : ""
            }`}
            style={{ marginTop: 12 }}
          >
            {state.text}
          </div>
        )}
      </div>
    </form>
  );
}
