"use client";

import { motion } from "framer-motion";

const plans = [
  {
    name: "Foundation",
    level: "Class 6-8",
    price: "3,999",
    period: "/ quarter",
    features: [
      "Live Science & Mathematics classes",
      "Structured weekly schedule",
      "Auto attendance tracking",
      "Parent visibility",
      "Limited batch size",
    ],
    popular: false,
  },
  {
    name: "Secondary",
    level: "Class 9-10",
    price: "4,999",
    period: "/ quarter",
    features: [
      "Physics, Chemistry, Mathematics",
      "Board-focused concept training",
      "Weekly assessments",
      "Performance tracking",
      "Structured discipline system",
    ],
    popular: true,
  },
  {
    name: "Senior",
    level: "Class 11-12 PCM / PCB",
    price: "6,999",
    period: "/ quarter",
    features: [
      "Advanced board-level sessions",
      "Subject-specific structured streams",
      "Live monitored classes",
      "Attendance + performance reports",
      "Parent accountability",
    ],
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section className="landing-section landing-pricing-wrap">
      <div className="landing-section-head">
        <p className="landing-label">Pricing</p>
        <h2 className="landing-h2">Structured quarterly batches.</h2>
        <p className="landing-pricing-sub">Clear pricing. Limited seats. Serious preparation.</p>
      </div>

      <motion.div
        className="landing-pricing-grid"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        transition={{ staggerChildren: 0.08 }}
      >
        {plans.map((plan) => (
          <motion.article
            key={plan.name}
            className={`landing-pricing-card ${plan.popular ? "popular" : ""}`}
            variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.26 }}
            whileHover={{ y: -6, scale: 1.02 }}
          >
            <div className="landing-pricing-head">
              <div>
                <h3>{plan.name}</h3>
                <p>{plan.level}</p>
              </div>
              {plan.popular ? <span className="pricing-pill">Most Popular</span> : null}
            </div>

            <div className="landing-price-line">
              <span className="currency">INR</span>
              <span className="price">{plan.price}</span>
              <span className="period">{plan.period}</span>
            </div>

            <ul className="landing-pricing-list">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>

            <button className="landing-btn landing-btn-primary pricing-btn">Enroll</button>
          </motion.article>
        ))}
      </motion.div>

      <p className="landing-pricing-note">
        No hidden fees. No long-term lock-ins. Cancel after each quarter.
      </p>
    </section>
  );
}
