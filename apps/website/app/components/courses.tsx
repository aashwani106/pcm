"use client";

import { motion } from "framer-motion";

const courses = [
  {
    title: "Physics",
    text: "Concept-first classes with numericals and test routines.",
    image:
      "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Chemistry",
    text: "Balanced theory and problems for board + competitive prep.",
    image:
      "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Mathematics",
    text: "Stepwise problem-solving with strict practice discipline.",
    image:
      "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
  },
];

export function CoursesSection() {
  return (
    <section className="landing-section">
      <div className="landing-section-head">
        <p className="landing-label">Courses</p>
        <h2 className="landing-h2">Focused streams for PCM outcomes.</h2>
      </div>
      <div className="landing-courses-grid">
        {courses.map((course) => (
          <motion.article
            key={course.title}
            className="landing-course-card"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.3 }}
            whileHover={{ y: -3 }}
          >
            <div className="landing-course-image">
              <img src={course.image} alt={`${course.title} course`} />
            </div>
            <h3>{course.title}</h3>
            <p>{course.text}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
