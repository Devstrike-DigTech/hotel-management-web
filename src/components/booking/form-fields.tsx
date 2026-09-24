"use client";

import { Check, FileArrowUp, Paperclip, X } from "@phosphor-icons/react";
import { useId, useRef, useState } from "react";
import type { AnswerValue, FormField } from "@/lib/booking-form";
import { humanError } from "@/lib/client-api";

/**
 * One field of the hotel's booking form, for every field type the Form Builder offers (except the
 * extras picker and the pickup block, which have their own components). Labelled, described and
 * marked invalid for assistive technology; the hint line turns into the error when there is one.
 */
export function FormFieldInput({
  field,
  value,
  onChange,
  error,
  required,
  upload,
  testId,
  hintOverride,
}: {
  field: FormField;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  error?: string | null;
  required: boolean;
  /** For FILE fields: where uploads go. */
  upload?: { slug: string; channel: string; preview: string | null; maxFileMB: number };
  testId?: string;
  hintOverride?: string | null;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const hint = error ?? hintOverride ?? field.guestPurpose ?? field.helpText ?? null;
  const common = {
    id,
    "aria-describedby": hint ? hintId : undefined,
    "aria-invalid": !!error || undefined,
    "aria-required": required || undefined,
    "data-testid": testId ?? `field-${field.key}`,
    name: field.key,
  };
  const str = typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
  const grouped = field.type === "SELECT" && field.options.length <= 4 ? "radios" : field.type === "MULTI_SELECT" || field.type === "YES_NO" ? "group" : null;

  const label = (
    <span className="mb-2 flex items-baseline justify-between gap-3 text-sm font-medium">
      <span>
        {field.label}
        {field.sensitive ? <span className="sr-only"> (kept private)</span> : null}
      </span>
      {!required && field.type !== "CHECKBOX" ? <span className="text-xs font-normal text-ink-muted">Optional</span> : null}
    </span>
  );
  const hintLine = hint ? (
    <p id={hintId} className={`mt-1.5 text-xs leading-relaxed ${error ? "text-danger" : "text-ink-muted"}`} role={error ? "alert" : undefined}>
      {hint}
    </p>
  ) : null;

  let control: React.ReactNode;
  switch (field.type) {
    case "LONG_TEXT":
      control = (
        <textarea {...common} className="field min-h-28 resize-y" value={str} maxLength={field.validation.maxLength ?? 500} placeholder={field.placeholder ?? undefined} onChange={(e) => onChange(e.target.value)} />
      );
      break;
    case "NUMBER":
      control = (
        <input
          {...common}
          className="field max-w-[10rem]"
          type="number"
          inputMode="numeric"
          min={field.validation.min}
          max={field.validation.max}
          value={str}
          placeholder={field.placeholder ?? undefined}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
      break;
    case "DATE":
      control = <input {...common} className="field max-w-[13rem]" type="date" value={str} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "TIME":
      control = <input {...common} className="field max-w-[10rem]" type="time" step={900} value={str} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "EMAIL":
      control = (
        <input {...common} className="field" type="email" inputMode="email" autoComplete="email" value={str} placeholder={field.placeholder ?? "you@example.com"} onChange={(e) => onChange(e.target.value)} />
      );
      break;
    case "PHONE":
      control = (
        <div className="flex">
          <span className="num inline-flex items-center rounded-l-sm border border-r-0 border-line-strong bg-surface-2 px-3 text-sm text-ink-muted">+234</span>
          <input
            {...common}
            className="field !rounded-l-none"
            type="tel"
            inputMode="tel"
            autoComplete={field.key === "phone" ? "tel-national" : "off"}
            value={str}
            placeholder={field.placeholder ?? "0803 123 4567"}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
      break;
    case "SELECT":
      control =
        grouped === "radios" ? (
          <div role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={hint ? hintId : undefined} className="flex flex-wrap gap-2" data-testid={common["data-testid"]}>
            {field.options.map((o) => (
              <Chip key={o.value} type="radio" name={`${id}-r`} checked={str === o.value} onChange={() => onChange(o.value)} label={o.label} />
            ))}
          </div>
        ) : (
          <select {...common} className="field appearance-none" value={str} onChange={(e) => onChange(e.target.value || null)}>
            <option value="">{field.placeholder ?? "Choose one"}</option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      break;
    case "MULTI_SELECT": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      control = (
        <div role="group" aria-labelledby={`${id}-label`} aria-describedby={hint ? hintId : undefined} className="flex flex-wrap gap-2" data-testid={common["data-testid"]}>
          {field.options.map((o) => (
            <Chip
              key={o.value}
              type="checkbox"
              checked={list.includes(o.value)}
              onChange={(on) => onChange(on ? [...list, o.value] : list.filter((v) => v !== o.value))}
              label={o.label}
            />
          ))}
        </div>
      );
      break;
    }
    case "YES_NO":
      control = (
        <div role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={hint ? hintId : undefined} className="inline-grid grid-cols-2 rounded-sm border border-line-strong p-1" data-testid={common["data-testid"]}>
          {(
            [
              [true, "Yes"],
              [false, "No"],
            ] as const
          ).map(([v, l]) => (
            <label
              key={l}
              className={`flex min-w-20 cursor-pointer items-center justify-center rounded-xs px-4 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laterite ${
                value === v ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
              }`}
            >
              <input type="radio" name={`${id}-yn`} className="sr-only" checked={value === v} onChange={() => onChange(v)} />
              {l}
            </label>
          ))}
        </div>
      );
      break;
    case "CHECKBOX":
      return (
        <div>
          <label className={`flex cursor-pointer items-start gap-3 text-[0.9375rem] leading-relaxed ${error ? "text-danger" : ""}`}>
            <input
              type="checkbox"
              {...common}
              checked={value === true}
              onChange={(e) => onChange(e.target.checked)}
              className="mt-0.5 size-[18px] shrink-0 accent-[var(--laterite)]"
            />
            <span>
              {field.label}
              {!required ? <span className="ml-2 text-xs text-ink-muted">Optional</span> : null}
            </span>
          </label>
          {hintLine}
        </div>
      );
    case "FILE":
      control = <FileInput field={field} value={value} onChange={onChange} upload={upload} describedBy={hint ? hintId : undefined} id={id} testId={common["data-testid"]} />;
      break;
    default:
      control = (
        <input
          {...common}
          className="field"
          type="text"
          autoComplete={field.key === "fullName" ? "name" : "off"}
          maxLength={field.validation.maxLength ?? 120}
          value={str}
          placeholder={field.placeholder ?? undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }

  return (
    <div>
      {grouped ? (
        <p id={`${id}-label`}>{label}</p>
      ) : (
        <label htmlFor={id} id={`${id}-label`}>
          {label}
        </label>
      )}
      {control}
      {hintLine}
    </div>
  );
}

function Chip({ type, name, checked, onChange, label }: { type: "radio" | "checkbox"; name?: string; checked: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2 rounded-sm border px-3.5 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-laterite ${
        checked ? "border-laterite bg-laterite/[0.07] text-ink" : "border-line-strong text-ink/85 hover:border-ink-muted"
      }`}
    >
      <input type={type} name={name} className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden className={`grid size-4 place-items-center ${type === "radio" ? "rounded-full" : "rounded-xs"} border ${checked ? "border-laterite bg-laterite text-laterite-ink" : "border-line-strong"}`}>
        {checked ? <Check size={10} weight="bold" /> : null}
      </span>
      {label}
    </label>
  );
}

const ACCEPT: Record<string, string> = { pdf: "application/pdf", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** A document for the hotel (Pro): uploaded at once, sent with the booking as its token. */
function FileInput({
  field,
  value,
  onChange,
  upload,
  describedBy,
  id,
  testId,
}: {
  field: FormField;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  upload?: { slug: string; channel: string; preview: string | null; maxFileMB: number };
  describedBy?: string;
  id: string;
  testId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const file = value && typeof value === "object" && "uploadId" in value ? (value as { uploadId: string; token: string; name?: string }) : null;
  const accept = (field.validation.accept ?? ["pdf", "jpeg", "png", "webp"]).map((a) => ACCEPT[a]).filter(Boolean).join(",");
  const maxMB = field.validation.maxFileMB ?? upload?.maxFileMB ?? 5;

  async function send(f: File) {
    if (!upload) return;
    setProblem(null);
    if (f.size > maxMB * 1024 * 1024) return setProblem(`That file is ${(f.size / 1024 / 1024).toFixed(1)} MB; the most is ${maxMB} MB.`);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", f);
      fd.set("fieldKey", field.key);
      fd.set("channel", upload.channel);
      if (upload.preview) fd.set("preview", upload.preview);
      const res = await fetch(`/api/v1/public/hotels/${encodeURIComponent(upload.slug)}/booking-form/uploads`, { method: "POST", body: fd, credentials: "same-origin" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body?.details?.fields?.file?.[0] as string) || body?.message || "The file could not be uploaded.");
      onChange({ uploadId: body.uploadId, token: body.token, name: body.name ?? f.name });
    } catch (e) {
      setProblem(humanError(e, "The file could not be uploaded."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid={testId}>
      {file ? (
        <p className="flex items-center justify-between gap-3 rounded-sm border border-line-strong bg-surface px-3 py-2.5 text-sm">
          <span className="inline-flex min-w-0 items-center gap-2">
            <Paperclip size={16} aria-hidden className="shrink-0 text-laterite" /> <span className="truncate">{file.name ?? "Uploaded"}</span>
          </span>
          <button type="button" className="inline-flex items-center gap-1 text-ink-muted hover:text-ink" onClick={() => onChange(null)} aria-label="Remove the file">
            <X size={14} aria-hidden /> Remove
          </button>
        </p>
      ) : (
        <label
          htmlFor={id}
          className={`flex cursor-pointer items-center gap-3 rounded-sm border border-dashed border-line-strong bg-surface px-4 py-3.5 text-sm transition-colors hover:border-ink-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laterite ${busy ? "opacity-60" : ""}`}
        >
          <FileArrowUp size={20} weight="light" className="text-laterite" aria-hidden />
          <span>
            {busy ? "Uploading" : "Choose a file"}{" "}
            <span className="text-ink-muted">
              PDF or photo, up to {maxMB} MB
            </span>
          </span>
          <input
            ref={input}
            id={id}
            type="file"
            className="sr-only"
            accept={accept}
            aria-describedby={describedBy}
            disabled={busy || !upload}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void send(f);
              if (input.current) input.current.value = "";
            }}
          />
        </label>
      )}
      {problem ? (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
