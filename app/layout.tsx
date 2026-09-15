import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { buildRootMetadata } from "@/lib/site-metadata";
import "./globals.css";

export const metadata: Metadata = buildRootMetadata();

export const viewport: Viewport = {
  themeColor: "#020812",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
