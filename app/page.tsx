import Link from "next/link";

export default function Home() {
  const prototypes = [
    { slug: "photo-pager", title: "Photo pager", date: "2026" },
    { slug: "grid-to-detail", title: "Grid to Detail", date: "2026" },
    {
      slug: "merchant-onboarding",
      title: "Merchant Onboarding",
      date: "2026",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#08090b",
        color: "#c9c9c9",
        fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        padding: "80px 40px",
      }}
    >
      <h1
        style={{
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 13,
          fontWeight: 400,
          color: "#5a5a5a",
          letterSpacing: "0.05em",
          marginBottom: 40,
        }}
      >
        uzo — prototypes
      </h1>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {prototypes.map((p, i) => (
          <li key={p.slug} style={{ marginBottom: 16 }}>
            <Link
              href={`/${p.slug}`}
              style={{
                color: "#d5d5d5",
                textDecoration: "none",
                fontSize: 15,
                display: "flex",
                gap: 24,
              }}
            >
              <span
                style={{
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                  color: "#5a5a5a",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{p.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
