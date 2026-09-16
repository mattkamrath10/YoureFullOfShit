import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { NativeShell } from "@/components/native/NativeShell";
import { buildRootMetadata } from "@/lib/site-metadata";
import "./globals.css";

export const metadata: Metadata = buildRootMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
          <NativeShell />
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
