import Link from "next/link";

export default function CoursesPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f3f0e7", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ margin: 0 }}>Courses</h1>
        <p style={{ color: "#4f5951" }}>Course catalog page is being finalized.</p>
        <Link href="/" style={{ color: "#1f5d39", fontWeight: 600 }}>
          Back to Home
        </Link>
      </div>
    </main>
  );
}
