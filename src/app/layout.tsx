import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Everlore Hollow | Affiliate Portal",
  description: "Join the Everlore Hollow affiliate program and earn commissions on referrals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#d4af37",
          colorBackground: "#1a0a2e",
          colorInputBackground: "#2c0046",
          colorText: "#f5f5f5",
        },
        elements: {
          card: "bg-[#1a0a2e]",
          formButtonPrimary: "bg-[#d4af37] hover:bg-[#b8962e] text-[#1a0a2e]",
          formFieldInput: "bg-[#2c0046] border-[#d4af37]/30",
        },
      }}
    >
      <html lang="en">
        <body className="antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
