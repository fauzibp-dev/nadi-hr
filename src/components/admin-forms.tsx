"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Field, Badge } from "@/components/ui";

type StatusState = {
  kind: "idle" | "busy" | "ok" | "error";
  text: string;
};

type Option = {
  id: string;
  label: string;
};

function Status({ state }: { state: StatusState }) {
  if (state.kind === "idle") return null;

  return (
    <div
      className={`callout ${state.kind === "error" ? "warning" : ""}`}
      style={{ marginTop: 12 }}
    >
      {state.kind === "busy" ? "Memproses…" : state.text}
    </div>
  );
}

async function jsonPost(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request gagal");
  }

  return data;
}

export function OfficeForm() {
  const [state, setState] = useState<StatusState>({
    kind: "idle",
    text: "",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    setState({
      kind: "busy",
      text: "",
    });

    try {
      await jsonPost("/api/admin/offices", {
        name: form.get("name"),
        address: form.get("address"),
        latitude: form.get("latitude"),
        longitude: form.get("longitude"),
        radius: form.get("radius"),
        maxAccuracy: form.get("accuracy"),
        timezone: form.get("timezone"),
      });

      setState({
        kind: "ok",
        text: "Office tersimpan. Muat ulang halaman untuk melihat data terbaru.",
      });
    } catch (error) {
      setState({
        kind: "error",
        text: error instanceof Error ? error.message : "Gagal",
      });
    }
  }

  return (
    <form onSubmit={submit} className="formgrid">
      <Field label="Nama office">
        <input
          name="name"
          className="input"
          defaultValue="Solo HQ"
          required
        />
      </Field>

      <Field label="Alamat">
        <input
          name="address"
          className="input"
          placeholder="Surakarta"
        />
      </Field>

      <Field label="Latitude">
        <input
          name="latitude"
          className="input"
          defaultValue="-7.566600"
          required
        />
      </Field>

      <Field label="Longitude">
        <input
          name="longitude"
          className="input"
          defaultValue="110.816700"
          required
        />
      </Field>

      <Field label="Radius (meter)">
        <input
          name="radius"
          className="input"
          type="number"
          min="10"
          defaultValue="50"
          required
        />
      </Field>

      <Field label="Max accuracy">
        <input
          name="accuracy"
          className="input"
          type="number"
          min="5"
          defaultValue="30"
          required
        />
      </Field>

      <Field label="Timezone" full>
        <input
          name="timezone"
          className="input"
          defaultValue="Asia/Jakarta"
          required
        />
      </Field>

      <div className="field full">
        <Button
          variant="primary"
          type="submit"
          disabled={state.kind === "busy"}
        >
          {state.kind === "busy" ? "Menyimpan…" : "Simpan office"}
        </Button>

        <Status state={state} />
      </div>
    </form>
  );
}

export function InviteEmployeeForm() {
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
      await jsonPost("/api/admin/invite", {
        email: form.get("email"),
        fullName: form.get("fullName"),
        employeeNumber: form.get("employeeNumber"),
        role: form.get("role"),
      });

      setState({
        kind: "ok",
        text: "Undangan dibuat. Supabase akan menangani email invite sesuai konfigurasi Auth.",
      });

      formElement.reset();
    } catch (error) {
      setState({
        kind: "error",
        text: error instanceof Error ? error.message : "Gagal",
      });
    }
  }

  return (
    <form onSubmit={submit} className="formgrid">
      <Field label="Nama">
        <input
          name="fullName"
          className="input"
          required
        />
      </Field>

      <Field label="Email">
        <input
          name="email"
          type="email"
          className="input"
          required
        />
      </Field>

      <Field label="Nomor karyawan">
        <input
          name="employeeNumber"
          className="input"
          placeholder="EMP-0012"
        />
      </Field>

      <Field label="Role">
        <select
          name="role"
          className="select"
          defaultValue="employee"
        >
          <option value="employee">Employee</option>
          <option value="supervisor">Supervisor</option>
          <option value="manager">Manager</option>
          <option value="hr">HR</option>
        </select>
      </Field>

      <div className="field full">
        <Button
          variant="primary"
          type="submit"
          disabled={state.kind === "busy"}
        >
          {state.kind === "busy" ? "Mengirim…" : "Kirim undangan"}
        </Button>

        <Status state={state} />
      </div>
    </form>
  );
}

export function AnnouncementForm() {
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
      await jsonPost("/api/admin/announcements", {
        title: form.get("title"),
        body: form.get("body"),
        target: {
          type: form.get("target"),
        },
        requireAck: form.get("ack") === "yes",
      });

      setState({
        kind: "ok",
        text: "Pengumuman dipublikasikan.",
      });

      formElement.reset();
    } catch (error) {
      setState({
        kind: "error",
        text: error instanceof Error ? error.message : "Gagal",
      });
    }
  }

  return (
    <form onSubmit={submit} className="formgrid">
      <Field label="Judul" full>
        <input
          name="title"
          className="input"
          required
          placeholder="Judul pengumuman"
        />
      </Field>

      <Field label="Target">
        <select
          name="target"
          className="select"
          defaultValue="all"
        >
          <option value="all">Semua karyawan</option>
          <option value="office">Office</option>
          <option value="department">Department</option>
        </select>
      </Field>

      <Field label="Acknowledgement">
        <select
          name="ack"
          className="select"
          defaultValue="yes"
        >
          <option value="yes">Required</option>
          <option value="no">Optional</option>
        </select>
      </Field>

      <Field label="Isi" full>
        <textarea
          name="body"
          className="textarea"
          required
          placeholder="Tulis dengan singkat dan jelas…"
        />
      </Field>

      <div className="field full">
        <Button
          variant="primary"
          type="submit"
          disabled={state.kind === "busy"}
        >
          {state.kind === "busy" ? "Mempublikasikan…" : "Publish"}
        </Button>

        <Status state={state} />
      </div>
    </form>
  );
}

export function CreateCompanyForm() {
  const [state, setState] = useState<StatusState>({
    kind: "idle",
    text: "",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    setState({
      kind: "busy",
      text: "",
    });

    try {
      const data = await jsonPost("/api/platform/companies", {
        name: form.get("name"),
        slug: form.get("slug"),
        timezone: form.get("timezone"),
        plan: form.get("plan"),
      });

      setState({
        kind: "ok",
        text: `Workspace dibuat: ${data.id || "success"}`,
      });
    } catch (error) {
      setState({
        kind: "error",
        text: error instanceof Error ? error.message : "Gagal",
      });
    }
  }

  return (
    <form onSubmit={submit} className="formgrid">
      <Field label="Nama perusahaan">
        <input
          name="name"
          className="input"
          required
        />
      </Field>

      <Field label="Slug">
        <input
          name="slug"
          className="input"
          required
          placeholder="pt-maju-jaya"
        />
      </Field>

      <Field label="Timezone">
        <input
          name="timezone"
          className="input"
          defaultValue="Asia/Jakarta"
          required
        />
      </Field>

      <Field label="Plan">
        <select
          name="plan"
          className="select"
          defaultValue="starter"
        >
          <option value="starter">Starter</option>
          <option value="business">Business</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </Field>

      <div className="field full">
        <Button
          variant="primary"
          type="submit"
          disabled={state.kind === "busy"}
        >
          {state.kind === "busy"
            ? "Membuat workspace…"
            : "Create workspace"}
        </Button>

        <Status state={state} />
      </div>
    </form>
  );
}

export function ApiHint({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <Badge tone="info">Live API</Badge>

      <span
        className="muted small"
        style={{ marginLeft: 8 }}
      >
        {children}
      </span>
    </div>
  );
}

export function ScheduleAssignmentForm() {
  const [employees, setEmployees] = useState<Option[]>([]);
  const [shifts, setShifts] = useState<Option[]>([]);
  const [offices, setOffices] = useState<Option[]>([]);

  const [state, setState] = useState<StatusState>({
    kind: "idle",
    text: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const responses = await Promise.all([
          fetch("/api/admin/employees"),
          fetch("/api/admin/shifts"),
          fetch("/api/admin/offices"),
        ]);

        if (responses.some((response) => !response.ok)) {
          throw new Error("Gagal memuat data schedule");
        }

        const [employeeData, shiftData, officeData] =
          await Promise.all(
            responses.map((response) => response.json())
          );

        if (cancelled) return;

        setEmployees(
          (employeeData.items || []).map(
            (item: {
              id: string;
              full_name: string;
            }) => ({
              id: item.id,
              label: item.full_name,
            })
          )
        );

        setShifts(
          (shiftData.items || []).map(
            (item: {
              id: string;
              name: string;
            }) => ({
              id: item.id,
              label: item.name,
            })
          )
        );

        setOffices(
          (officeData.items || []).map(
            (item: {
              id: string;
              name: string;
            }) => ({
              id: item.id,
              label: item.name,
            })
          )
        );
      } catch {
        if (!cancelled) {
          setState({
            kind: "error",
            text: "Gagal memuat employee, shift, atau office.",
          });
        }
      }
    }

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    setState({
      kind: "busy",
      text: "",
    });

    try {
      await jsonPost("/api/admin/schedules", {
        employeeId: form.get("employeeId"),
        shiftId: form.get("shiftId") || null,
        officeId: form.get("officeId") || null,
        workDate: form.get("workDate"),
        workMode: form.get("workMode"),
        note: form.get("note"),
      });

      setState({
        kind: "ok",
        text: "Schedule tersimpan.",
      });
    } catch (error) {
      setState({
        kind: "error",
        text: error instanceof Error ? error.message : "Gagal",
      });
    }
  }

  return (
    <form
      className="formgrid"
      onSubmit={submit}
    >
      <Field label="Employee">
        <select
          name="employeeId"
          className="select"
          required
          defaultValue=""
        >
          <option value="">Pilih…</option>

          {employees.map((employee) => (
            <option
              key={employee.id}
              value={employee.id}
            >
              {employee.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Tanggal">
        <input
          name="workDate"
          className="input"
          type="date"
          required
        />
      </Field>

      <Field label="Work mode">
        <select
          name="workMode"
          className="select"
          defaultValue="office"
        >
          <option value="office">Office</option>
          <option value="wfh">WFH</option>
          <option value="field">Field</option>
          <option value="business_trip">
            Business trip
          </option>
          <option value="off">Off</option>
        </select>
      </Field>

      <Field label="Shift">
        <select
          name="shiftId"
          className="select"
          defaultValue=""
        >
          <option value="">Tanpa shift</option>

          {shifts.map((shift) => (
            <option
              key={shift.id}
              value={shift.id}
            >
              {shift.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Office">
        <select
          name="officeId"
          className="select"
          defaultValue=""
        >
          <option value="">
            Default eligible office
          </option>

          {offices.map((office) => (
            <option
              key={office.id}
              value={office.id}
            >
              {office.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Catatan">
        <input
          name="note"
          className="input"
        />
      </Field>

      <div className="field full">
        <Button
          variant="primary"
          type="submit"
          disabled={state.kind === "busy"}
        >
          {state.kind === "busy"
            ? "Menyimpan…"
            : "Assign schedule"}
        </Button>

        <Status state={state} />
      </div>
    </form>
  );
}
