import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Cinzel, Cormorant_Garamond } from "next/font/google";
import ParticleBackground from "@/components/ParticleBackground";
import "./globals.css";

// Cinzel for headings - elegant display serif
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});

// Cormorant Garamond for body text - elegant readable serif
const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

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
      <html lang="en" className={`${cinzel.variable} ${cormorantGaramond.variable}`}>
        <body className="antialiased font-body">
          <ParticleBackground />
          <div className="relative z-10">
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
