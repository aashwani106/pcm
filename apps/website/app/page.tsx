"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CoursesSection } from "./components/courses";
import { FeaturesSection } from "./components/features";
import { HeroSection } from "./components/hero";
import { StatsSection } from "./components/stats";

const achievers = [
  { name: "Aarav Sharma", score: "96.2%", stream: "PCM", image: "https://i.pravatar.cc/200?img=12" },
  { name: "Ananya Verma", score: "95.4%", stream: "PCM", image: "https://i.pravatar.cc/200?img=32" },
  { name: "Rohan Gupta", score: "94.8%", stream: "PCM", image: "https://i.pravatar.cc/200?img=15" },
  { name: "Ishita Singh", score: "93.9%", stream: "PCM", image: "https://i.pravatar.cc/200?img=47" },
  { name: "Kunal Mishra", score: "92.7%", stream: "PCM", image: "https://i.pravatar.cc/200?img=58" },
  { name: "Priya Nair", score: "91.8%", stream: "PCM", image: "https://i.pravatar.cc/200?img=44" },
];

const testimonials = [
  {
    quote: "The daily structure and attendance tracking made my preparation consistent.",
    author: "Aarav Sharma",
    role: "Class 12 • 96.2% Boards",
  },
  {
    quote: "Every session stayed focused. The discipline here is the biggest difference.",
    author: "Ananya Verma",
    role: "Class 12 • 95.4% Boards",
  },
  {
    quote: "My parents could track my attendance and progress. That kept me accountable.",
    author: "Rohan Gupta",
    role: "Class 12 • 94.8% Boards",
  },
];

const achieverImageByName = Object.fromEntries(achievers.map((item) => [item.name, item.image]));

const teachers = [
  {
    name: "Prof. H. C. Verma",
    subject: "Physics",
    exp: "15+ years teaching boards + JEE foundation",
    image: "https://i.pravatar.cc/200?img=65",
  },
  {
    name: "Dr. Neha Kulkarni",
    subject: "Chemistry",
    exp: "12+ years in conceptual + organic chemistry",
    image: "https://i.pravatar.cc/200?img=49",
  },
  {
    name: "Amit Saxena",
    subject: "Mathematics",
    exp: "14+ years focused on speed + accuracy training",
    image: "https://i.pravatar.cc/200?img=56",
  },
];

export default function HomePage() {
  return (
    <main className="landing-root">
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <CoursesSection />

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="landing-label">Faculty</p>
          <h2 className="landing-h2">Mentors driving consistent board performance.</h2>
        </div>
        <div className="landing-teacher-grid">
          {teachers.map((teacher, index) => (
            <motion.article
              key={teacher.name}
              className="landing-teacher-card"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.26, delay: index * 0.05 }}
              whileHover={{ y: -3 }}
            >
              <img src={teacher.image} alt={teacher.name} />
              <div>
                <h3>{teacher.name}</h3>
                <p>{teacher.subject}</p>
                <span>{teacher.exp}</span>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-testimonials">
        <div className="landing-section-head">
          <p className="landing-meta">Verified Results 2024 Batch</p>
          <p className="landing-label">Board Results</p>
          <h2 className="landing-h2">Students scoring 90%+ in board exams.</h2>
        </div>
        <div className="landing-achiever-grid">
          {achievers.map((student, index) => (
            <motion.article
              key={student.name}
              className="landing-achiever-card"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.26, delay: index * 0.04 }}
              whileHover={{ y: -3 }}
            >
              <img src={student.image} alt={student.name} />
              <div>
                <h3>{student.name}</h3>
                <p>{student.stream}</p>
              </div>
              <strong>{student.score}</strong>
            </motion.article>
          ))}
        </div>

        <div className="landing-section-head">
          <p className="landing-label">Testimonials</p>
          <h2 className="landing-h2">Families trust structure, consistency, and outcomes.</h2>
        </div>
        <div className="landing-testimonial-grid">
          {testimonials.map((item, index) => (
            <motion.article
              key={item.author}
              className="landing-testimonial-card"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.28, delay: index * 0.06 }}
              whileHover={{ y: -3 }}
            >
              <div className="landing-testimonial-head">
                <img src={achieverImageByName[item.author]} alt={item.author} />
                <div>
                  <h4>{item.author}</h4>
                  <span>{item.role}</span>
                </div>
              </div>
              <p>“{item.quote}”</p>
            </motion.article>
          ))}
        </div>
      </section>

      <motion.section
        className="landing-cta"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.32 }}
      >
        <h2>Ready to join the next batch?</h2>
        <Link href="/courses" className="landing-btn landing-btn-primary">
          Enroll Now
        </Link>
      </motion.section>

      <footer className="landing-footer">
        <p>PCM Coaching • Structured Live PCM Learning</p>
      </footer>
    </main>
  );
}
