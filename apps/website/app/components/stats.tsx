"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "500+", label: "Students" },
  { value: "98%", label: "Attendance Rate" },
  { value: "Live", label: "Monitored Classes" },
];

export function StatsSection() {
  return (
    <section className="landing-section">
      <motion.div
        className="landing-stats"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        transition={{ staggerChildren: 0.1 }}
      >
        {stats.map((item) => (
          <motion.article
            key={item.label}
            className="landing-stat-card"
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.3 }}
          >
            <h3>{item.value}</h3>
            <p>{item.label}</p>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}
