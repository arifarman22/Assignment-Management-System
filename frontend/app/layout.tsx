import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "EduAssign — Assignment Management System",
  description: "Premium school assignment and submission management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: "#0F172A",
                color: "#F8FAFC",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: "500",
                padding: "12px 16px",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.25)",
              },
              success: { iconTheme: { primary: "#10B981", secondary: "#F8FAFC" } },
              error: { iconTheme: { primary: "#F43F5E", secondary: "#F8FAFC" } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
