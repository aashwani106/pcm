"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0 }
};

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <motion.div
          className="hero-copy"
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.08 }}
        >
          <motion.p variants={fadeUp} className="eyebrow">
            PCM Coaching
          </motion.p>
          <motion.h1 variants={fadeUp} className="hero-title">
            Learn live, track progress, and join classes instantly.
          </motion.h1>
          <motion.p variants={fadeUp} className="hero-text">
            Minimal classroom experience designed for real coaching workflows. Fast join, low-latency
            stream, and clear teacher-first controls.
          </motion.p>
          <motion.div variants={fadeUp} className="hero-actions">
            <Link href="/classroom" className="btn btn-primary">
              Join Live Class
            </Link>
            <a
              className="btn btn-muted"
              href="https://images.unsplash.com"
              target="_blank"
              rel="noreferrer"
            >
              Photo Credits
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero-media-card"
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Image
            src="https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1280&q=80"
            alt="Students in a coaching classroom"
            fill
            className="hero-media-image"
            priority
          />
          <div className="hero-media-overlay">
            <span className="pulse-dot" />
            Live coaching starts in one click
          </div>
        </motion.div>
      </section>

      <section className="feature-grid">
        <motion.article className="feature-card" whileHover={{ y: -4 }}>
          <h3>Courses</h3>
          <p>Course storefront with clean pricing, enrollment, and structured modules.</p>
        </motion.article>
        <motion.article className="feature-card" whileHover={{ y: -4 }}>
          <h3>Live Classes</h3>
          <p>Teacher-led live sessions powered by LiveKit SFU with role-safe token access.</p>
        </motion.article>
        <motion.article className="feature-card" whileHover={{ y: -4 }}>
          <h3>Performance</h3>
          <p>Fast pages, smooth transitions, and direct class join from mobile and web.</p>
        </motion.article>
      </section>
    </main>
  );
}
