"use client";

import { FormEvent, useState } from "react";

type EnrollmentForm = {
  student_name: string;
  student_email: string;
  class_level: string;
  stream: "PCM" | "PCB" | "Science";
  board: "CBSE" | "ICSE" | "UP";
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  previous_marks: string;
  city: string;
};

const initialForm: EnrollmentForm = {
  student_name: "",
  student_email: "",
  class_level: "9",
  stream: "PCM",
  board: "CBSE",
  parent_name: "",
  parent_phone: "",
  parent_email: "",
  previous_marks: "",
  city: "",
};

export default function EnrollPage() {
  const [form, setForm] = useState<EnrollmentForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const previousMarksNum = form.previous_marks ? Number(form.previous_marks) : null;

    try {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_name: form.student_name,
          student_email: form.student_email,
          class_level: form.class_level,
          stream: form.stream,
          board: form.board,
          parent_name: form.parent_name,
          parent_phone: form.parent_phone,
          parent_email: form.parent_email,
          previous_marks: Number.isFinite(previousMarksNum) ? previousMarksNum : null,
          city: form.city || null,
        }),
      });

      const raw = await response.text();
      let result: { message?: string } | null = null;
      try {
        result = raw ? (JSON.parse(raw) as { message?: string }) : null;
      } catch {
        result = null;
      }
      if (!response.ok) {
        throw new Error(result?.message || "Failed to submit enrollment request");
      }

      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit enrollment request");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="enroll-page">
        <section className="enroll-card enroll-success">
          <h1>Enrollment request received.</h1>
          <p>Our team will contact you within 24 hours.</p>
          <a
            href="https://wa.me/919999999999"
            target="_blank"
            rel="noreferrer"
            className="landing-btn landing-btn-primary"
          >
            Contact on WhatsApp
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="enroll-page">
      <section className="enroll-card">
        <header className="enroll-head">
          <p className="landing-label">Enrollment</p>
          <h1>Request Enrollment</h1>
          <p>Structured onboarding with manual admin approval.</p>
        </header>

        <form className="enroll-form" onSubmit={onSubmit}>
          <h2>Student Information</h2>
          <div className="enroll-grid">
            <label>
              Full Name
              <input
                required
                value={form.student_name}
                onChange={(e) => setForm((prev) => ({ ...prev, student_name: e.target.value }))}
              />
            </label>
            <label>
              Student Email
              <input
                type="email"
                required
                value={form.student_email}
                onChange={(e) => setForm((prev) => ({ ...prev, student_email: e.target.value }))}
              />
            </label>
            <label>
              Class
              <select
                value={form.class_level}
                onChange={(e) => setForm((prev) => ({ ...prev, class_level: e.target.value }))}
              >
                {["6", "7", "8", "9", "10", "11", "12"].map((level) => (
                  <option key={level} value={level}>
                    Class {level}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Stream
              <select
                value={form.stream}
                onChange={(e) => setForm((prev) => ({ ...prev, stream: e.target.value as EnrollmentForm["stream"] }))}
              >
                <option value="PCM">PCM</option>
                <option value="PCB">PCB</option>
                <option value="Science">Science</option>
              </select>
            </label>
            <label>
              Board
              <select
                value={form.board}
                onChange={(e) => setForm((prev) => ({ ...prev, board: e.target.value as EnrollmentForm["board"] }))}
              >
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE</option>
                <option value="UP">UP</option>
              </select>
            </label>
          </div>

          <h2>Parent Information</h2>
          <div className="enroll-grid">
            <label>
              Parent Name
              <input
                required
                value={form.parent_name}
                onChange={(e) => setForm((prev) => ({ ...prev, parent_name: e.target.value }))}
              />
            </label>
            <label>
              Parent Phone
              <input
                required
                value={form.parent_phone}
                onChange={(e) => setForm((prev) => ({ ...prev, parent_phone: e.target.value }))}
              />
            </label>
            <label>
              Parent Email
              <input
                type="email"
                required
                value={form.parent_email}
                onChange={(e) => setForm((prev) => ({ ...prev, parent_email: e.target.value }))}
              />
            </label>
          </div>

          <h2>Optional</h2>
          <div className="enroll-grid">
            <label>
              Previous marks (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.previous_marks}
                onChange={(e) => setForm((prev) => ({ ...prev, previous_marks: e.target.value }))}
              />
            </label>
            <label>
              City
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              />
            </label>
          </div>

          {error ? <p className="enroll-error">{error}</p> : null}

          <button className="landing-btn landing-btn-primary enroll-submit" type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Request Enrollment"}
          </button>
        </form>
      </section>
    </main>
  );
}
