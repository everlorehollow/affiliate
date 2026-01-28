"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Sparkles,
  BookOpen,
  Gift,
  TrendingUp,
  Check,
  ChevronRight,
  Star,
  Users,
  Heart
} from "lucide-react";
import { AuthRedirect } from "@/components/AuthRedirect";

const benefits = [
  {
    icon: TrendingUp,
    title: "Recurring Commission",
    description: "Earn 15-25% on every subscription including renewals. You keep earning as long as they stay.",
  },
  {
    icon: BookOpen,
    title: "Exclusive Lore Access",
    description: "Get partner-only stories you can share with your audience.",
  },
  {
    icon: Gift,
    title: "Free Subscription",
    description: "Top partners receive a complimentary subscription so you always know what you're sharing.",
  },
  {
    icon: Star,
    title: "Tier Rewards",
    description: "Hit milestones to unlock exclusive artifacts, higher commissions, and even your name in the story.",
  },
];

const tiers = [
  {
    name: "Initiate",
    commission: "15%",
    description: "Where every journey begins",
    requirement: "All partners",
    color: "from-[#9d7cd8] to-[#6b21a8]",
  },
  {
    name: "Adept",
    commission: "20%",
    description: "Proven storytellers",
    requirement: "6+ referrals",
    color: "from-[#d4af37] to-[#b8962e]",
  },
  {
    name: "Inner Circle",
    commission: "25%",
    description: "The trusted few",
    requirement: "16+ referrals",
    color: "from-[#e5c04a] to-[#d4af37]",
    featured: true,
  },
];

const idealPartners = [
  "You're a Bookstagrammer or BookTok creator sharing fantasy reads",
  "You love cozy unboxings, dark academia aesthetics, or bookish lifestyle content",
  "You're a fantasy author with readers who'd love immersive story experiences",
  "You review candles, teas, or subscription boxes for the bookish community",
  "You're already a subscriber who can't stop talking about us (we see you)",
];

export default function Home() {
  const [sliderValue, setSliderValue] = useState(10);
  const monthlyEarnings = sliderValue * 8; // $8 average commission per referral
  const yearlyEarnings = monthlyEarnings * 12;

  return (
    <div className="min-h-screen">
      <AuthRedirect />
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#d4af37]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-[#9d7cd8]/10 rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 mb-8"
          >
            <Sparkles className="w-4 h-4 text-[#d4af37]" />
            <span className="text-sm text-[#d4af37] font-heading tracking-wide">Partner Program</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-heading font-bold text-[#d4af37] mb-6 text-glow-gold tracking-wide">
            Join the Inner Circle
          </h1>

          <p className="text-xl md:text-2xl text-[#f5f5f5]/90 font-body max-w-2xl mx-auto mb-4 leading-relaxed">
            We're building a community of readers who become part of the story.
          </p>

          <p className="text-lg text-[#9d7cd8] font-body max-w-xl mx-auto mb-12">
            If you already share books and magical finds with your people, why not earn for it?
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[#1a0a2e] font-heading font-semibold rounded-xl shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:shadow-[0_0_40px_rgba(212,175,55,0.5)] transition-all"
              >
                Become a Partner
                <ChevronRight className="w-5 h-5" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 px-8 py-4 border border-[#d4af37]/50 text-[#d4af37] font-heading font-semibold rounded-xl hover:bg-[#d4af37]/10 hover:border-[#d4af37] transition-all"
              >
                Sign In
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-[#d4af37]/30 flex items-start justify-center p-2"
          >
            <div className="w-1 h-2 bg-[#d4af37] rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* Why Join Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[#d4af37] mb-4">
              Why Join?
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#9d7cd8] to-transparent mx-auto" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="group relative p-8 rounded-2xl bg-[#1a0a2e]/60 border border-[#d4af37]/20 backdrop-blur-sm hover:border-[#d4af37]/40 hover:shadow-[0_0_30px_rgba(212,175,55,0.1)] transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/5 via-transparent to-[#9d7cd8]/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#d4af37]/20 to-[#9d7cd8]/20 flex items-center justify-center mb-6 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all">
                    <benefit.icon className="w-7 h-7 text-[#d4af37]" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold text-[#d4af37] mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-[#f5f5f5]/80 font-body leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Tiers Section */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#9d7cd8]/5 via-transparent to-[#d4af37]/5" />

        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[#d4af37] mb-4">
              Commission Tiers
            </h2>
            <p className="text-lg text-[#9d7cd8] font-body max-w-xl mx-auto">
              The more you share, the more you earn—plus exclusive rewards at each level.
            </p>
          </motion.div>

          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#9d7cd8] to-transparent mx-auto mb-16" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier, index) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`relative p-8 rounded-2xl border backdrop-blur-sm transition-all ${
                  tier.featured
                    ? "bg-gradient-to-b from-[#d4af37]/10 to-[#1a0a2e]/80 border-[#d4af37]/50 shadow-[0_0_40px_rgba(212,175,55,0.15)]"
                    : "bg-[#1a0a2e]/60 border-[#d4af37]/20 hover:border-[#d4af37]/40"
                }`}
              >
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#d4af37] text-[#1a0a2e] text-xs font-heading font-semibold rounded-full">
                    MOST POPULAR
                  </div>
                )}

                <div className={`inline-block px-3 py-1 rounded-full bg-gradient-to-r ${tier.color} text-[#1a0a2e] text-xs font-heading font-semibold mb-4`}>
                  {tier.name}
                </div>

                <div className="mb-4">
                  <span className="text-5xl font-heading font-bold text-[#f5f5f5]">{tier.commission}</span>
                  <span className="text-[#9d7cd8] font-body ml-2">commission</span>
                </div>

                <p className="text-[#f5f5f5]/80 font-body mb-4">{tier.description}</p>

                <div className="pt-4 border-t border-[#d4af37]/20">
                  <p className="text-sm text-[#9d7cd8] font-body">{tier.requirement}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings Calculator Section */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[#d4af37] mb-4">
              Your Potential Earnings
            </h2>
            <p className="text-lg text-[#9d7cd8] font-body">
              Drag to see what you could earn
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-2xl bg-[#1a0a2e]/60 border border-[#d4af37]/20 backdrop-blur-sm"
          >
            <div className="mb-8">
              <label className="block text-[#f5f5f5] font-heading mb-4 text-center">
                Monthly Referrals: <span className="text-[#d4af37] text-2xl font-bold">{sliderValue}</span>
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                className="w-full h-2 bg-[#2c0046] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
                style={{
                  background: `linear-gradient(to right, #d4af37 0%, #d4af37 ${(sliderValue / 50) * 100}%, #2c0046 ${(sliderValue / 50) * 100}%, #2c0046 100%)`,
                }}
              />
              <div className="flex justify-between text-sm text-[#9d7cd8] mt-2">
                <span>1</span>
                <span>50</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-6 rounded-xl bg-[#2c0046]/50 border border-[#d4af37]/20">
                <p className="text-sm text-[#9d7cd8] font-body mb-2">Monthly Earnings</p>
                <p className="text-3xl font-heading font-bold text-[#d4af37]">${monthlyEarnings}</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-[#2c0046]/50 border border-[#d4af37]/20">
                <p className="text-sm text-[#9d7cd8] font-body mb-2">Yearly Earnings</p>
                <p className="text-3xl font-heading font-bold text-[#d4af37]">${yearlyEarnings.toLocaleString()}</p>
              </div>
            </div>

            <p className="text-xs text-[#9d7cd8]/60 text-center mt-6">
              *Based on average subscription value. Actual earnings may vary.
            </p>
          </motion.div>
        </div>
      </section>

      {/* This Is For You Section */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#9d7cd8]/5 to-transparent" />

        <div className="max-w-4xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[#d4af37] mb-4">
              This Is For You If...
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#9d7cd8] to-transparent mx-auto" />
          </motion.div>

          <div className="space-y-4">
            {idealPartners.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-[#1a0a2e]/40 border border-[#d4af37]/10 hover:border-[#d4af37]/30 transition-all"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#d4af37]/20 flex items-center justify-center mt-0.5">
                  <Check className="w-4 h-4 text-[#d4af37]" />
                </div>
                <p className="text-[#f5f5f5]/90 font-body text-lg">{item}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-[#d4af37]/10 to-[#9d7cd8]/10 border border-[#d4af37]/20 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-[#d4af37]" />
              <Users className="w-5 h-5 text-[#9d7cd8]" />
            </div>
            <p className="text-xl text-[#f5f5f5] font-body italic">
              "You don't need a massive following. You need people who trust your taste."
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-[#d4af37] mb-6">
            Ready to Join the Hollow?
          </h2>
          <p className="text-lg text-[#9d7cd8] font-body mb-8 max-w-xl mx-auto">
            We accept all fans of the Hollow. Start earning today by sharing what you already love.
          </p>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[#1a0a2e] font-heading font-bold text-lg rounded-xl shadow-[0_0_40px_rgba(212,175,55,0.3)] hover:shadow-[0_0_60px_rgba(212,175,55,0.5)] transition-all"
            >
              <Sparkles className="w-5 h-5" />
              Become a Partner
              <ChevronRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-[#d4af37]/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[#9d7cd8] text-sm font-body">
            &copy; {new Date().getFullYear()} Everlore Hollow. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/sign-in" className="text-[#9d7cd8] hover:text-[#d4af37] text-sm font-body transition-colors">
              Partner Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
