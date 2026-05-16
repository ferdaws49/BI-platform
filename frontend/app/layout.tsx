// app/layout.tsx  ← EL ROOT LAYOUT (moch directeur)
import type { Metadata } from "next";
import { NotificationProvider } from "@/context/NotificationContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "BI Platform",
  description: "Tableau de bord BI",
};

import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /*
      suppressHydrationWarning → لازمة لأن Next.js يرندر في server
      بـ theme="light"، لكن localStorage ما موجودش في server.
      هذه تمنع el hydration warning.
    */
    <html lang="fr" suppressHydrationWarning>
      <body>
        <NotificationProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </NotificationProvider>
      </body>
    </html>
  );
}