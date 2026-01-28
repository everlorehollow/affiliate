import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Cinzel, Cormorant_Garamond } from "next/font/google";
import ParticleBackground from "@/components/ParticleBackground";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
          colorTextSecondary: "#9d7cd8",
          colorInputText: "#f5f5f5",
          colorNeutral: "#f5f5f5",
        },
        elements: {
          // Card and container styles
          card: "bg-[#1a0a2e] border border-[#d4af37]/20",
          rootBox: "text-[#f5f5f5]",

          // Form elements
          formButtonPrimary: "bg-[#d4af37] hover:bg-[#b8962e] text-[#1a0a2e] font-semibold",
          formFieldInput: "bg-[#2c0046] border-[#d4af37]/30 text-[#f5f5f5]",
          formFieldLabel: "text-[#f5f5f5]",
          formFieldInputShowPasswordButton: "text-[#9d7cd8] hover:text-[#d4af37]",
          formFieldInputShowPasswordIcon: "text-[#9d7cd8]",

          // Social buttons (Google, etc.)
          socialButtonsBlockButton: "bg-[#2c0046] border-[#d4af37]/30 text-[#f5f5f5] hover:bg-[#3d0060]",
          socialButtonsBlockButtonText: "text-[#f5f5f5]",
          socialButtonsProviderIcon: "brightness-0 invert",

          // User button and profile
          userButtonPopoverCard: "bg-[#1a0a2e] border border-[#d4af37]/20",
          userButtonPopoverActions: "bg-[#1a0a2e]",
          userButtonPopoverActionButton: "text-[#f5f5f5] hover:bg-[#2c0046]",
          userButtonPopoverActionButtonText: "text-[#f5f5f5]",
          userButtonPopoverActionButtonIcon: "text-[#9d7cd8]",
          userButtonPopoverFooter: "hidden",
          userPreviewMainIdentifier: "text-[#f5f5f5]",
          userPreviewSecondaryIdentifier: "text-[#9d7cd8]",

          // Profile and account pages
          profileSectionPrimaryButton: "text-[#d4af37] hover:text-[#e5c04a]",
          accordionTriggerButton: "text-[#f5f5f5]",
          navbarButton: "text-[#f5f5f5] hover:text-[#d4af37]",

          // General text elements
          headerTitle: "text-[#d4af37]",
          headerSubtitle: "text-[#9d7cd8]",
          dividerLine: "bg-[#d4af37]/20",
          dividerText: "text-[#9d7cd8]",
          footerActionLink: "text-[#d4af37] hover:text-[#e5c04a]",
          footerActionText: "text-[#9d7cd8]",
          identityPreviewText: "text-[#f5f5f5]",
          identityPreviewEditButton: "text-[#d4af37]",

          // Alerts and badges
          badge: "bg-[#d4af37]/20 text-[#d4af37]",
          alertText: "text-[#f5f5f5]",

          // Modal and menu
          modalCloseButton: "text-[#9d7cd8] hover:text-[#d4af37]",
          menuButton: "text-[#f5f5f5]",
          menuList: "bg-[#1a0a2e] border border-[#d4af37]/20",
          menuItem: "text-[#f5f5f5] hover:bg-[#2c0046]",
        },
      }}
    >
      <html lang="en" className={`${cinzel.variable} ${cormorantGaramond.variable}`}>
        <body className="antialiased font-body">
          <TooltipProvider>
            <ParticleBackground />
            <div className="relative z-10">
              {children}
            </div>
            <Toaster />
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
