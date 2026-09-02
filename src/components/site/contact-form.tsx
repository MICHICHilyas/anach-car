"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { sendContactMessage } from "@/server/actions/contact";
import type { Dictionary } from "@/i18n";

export function ContactForm({ t }: { t: Dictionary }) {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await sendContactMessage({
        name: String(formData.get("name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        email: String(formData.get("email") ?? ""),
        subject: String(formData.get("subject") ?? ""),
        message: String(formData.get("message") ?? ""),
        website: String(formData.get("website") ?? ""),
      });

      if (result.ok) {
        setSent(true);
        form.reset();
        return;
      }
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-[var(--color-success)]/25 bg-[var(--color-success-soft)] px-6 py-12 text-center">
        <CheckCircle2 className="size-9 text-[var(--color-success)]" />
        <p className="mt-4 text-[15px] font-semibold text-navy-900">
          {t.contact.success}
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => setSent(false)}
        >
          {t.contact.formTitle}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-lg bg-[var(--color-danger-soft)] px-4 py-3 text-[13px] font-medium text-[var(--color-danger)]"
        >
          <AlertCircle className="mt-px size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t.contact.fields.name}
          htmlFor="contact-name"
          required
          error={fieldErrors.name}
        >
          <Input id="contact-name" name="name" autoComplete="name" required />
        </Field>
        <Field
          label={t.contact.fields.phone}
          htmlFor="contact-phone"
          required
          error={fieldErrors.phone}
        >
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
          />
        </Field>
      </div>

      <Field
        label={t.contact.fields.email}
        htmlFor="contact-email"
        hint={t.common.optional}
        error={fieldErrors.email}
      >
        <Input id="contact-email" name="email" type="email" autoComplete="email" />
      </Field>

      <Field
        label={t.contact.fields.subject}
        htmlFor="contact-subject"
        required
        error={fieldErrors.subject}
      >
        <Input id="contact-subject" name="subject" required />
      </Field>

      <Field
        label={t.contact.fields.message}
        htmlFor="contact-message"
        required
        error={fieldErrors.message}
      >
        <Textarea id="contact-message" name="message" rows={6} required />
      </Field>

      <div className="absolute -left-[9999px]" aria-hidden>
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t.contact.submitting}
          </>
        ) : (
          <>
            <Send className="size-4" />
            {t.contact.submit}
          </>
        )}
      </Button>
    </form>
  );
}
