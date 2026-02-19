"use client";

import { motion } from "framer-motion";

const steps = [
  "Enroll in a course",
  "Join live interactive class",
  "Track attendance and performance",
];

const features = [
  "Live monitored classroom",
  "Auto attendance tracking",
  "Parent notifications",
  "Batch-based access",
  "Secure role-based access control",
];

export function FeaturesSection() {
  return (
    <section className="landing-section landing-surface">
      <div className="landing-grid-2">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.3 }}
        >
          <p className="landing-label">How It Works</p>
          <h2 className="landing-h2">A disciplined loop from enrollment to outcomes.</h2>
          <ol className="landing-step-list">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.35 }}
        >
          <p className="landing-label">Core Strengths</p>
          <h2 className="landing-h2">Built for trust, not classroom chaos.</h2>
          <div className="landing-feature-list">
            {features.map((item) => (
              <article key={item} className="landing-feature-item">
                <span className="dot" />
                <p>{item}</p>
              </article>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
