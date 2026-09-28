import "./globals.css";

export const metadata = {
  title: "Customer Loger",
  description: "Project receivables and customer follow-up",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
