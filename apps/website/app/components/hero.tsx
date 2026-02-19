"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function HeroSection() {
  return (
    <section className="landing-hero">
      <motion.div
        className="landing-hero-copy"
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.1 }}
      >
        <motion.p variants={fadeUp} className="landing-eyebrow">
          Performance-Driven PCM Coaching
        </motion.p>
        <motion.h1 variants={fadeUp} className="landing-title">
          Serious Live Classes for Serious Students.
        </motion.h1>
        <motion.p variants={fadeUp} className="landing-subtitle">
          Structured physics, chemistry, and mathematics coaching with live attendance,
          disciplined sessions, and parent-facing progress accountability.
        </motion.p>
        <motion.div variants={fadeUp} className="landing-actions">
          <Link href="/courses" className="landing-btn landing-btn-primary">
            View Courses
          </Link>
          <Link href="/classroom" className="landing-btn landing-btn-secondary">
            Login
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        className="landing-hero-panel"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        animate={{ y: [0, -4, 0] }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.35, y: { duration: 4.2, repeat: Infinity, ease: "easeInOut" } }}
      >
        <div className="landing-hero-mock-head">
          <span className="landing-live-dot" />
          <span>Live Classroom Monitor</span>
          <span className="landing-mock-state">Connected</span>
        </div>
        <div className="landing-hero-mock-grid">
          <div className="landing-metric-card">
            <p>Today Attendance</p>
            <h3>98%</h3>
          </div>
          <div className="landing-metric-card">
            <p>Active Students</p>
            <h3>524</h3>
          </div>
          <div className="landing-metric-card wide">
            <p>Live Batch</p>
            <h3>Class 10 Physics • 82 Online</h3>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
