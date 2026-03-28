import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Next.js Web Worker Demo",
  description: "Learn how Web Workers work in Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#0a0a0a",
          color: "#eee",
          fontFamily: "monospace",
        }}
      >
        {children}
      </body>
    </html>
  );
}
