import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  // Redirect to dashboard if already signed in
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-5xl font-bold text-[#d4af37] mb-4">
          Everlore Hollow
        </h1>
        <h2 className="text-2xl text-gray-300 mb-2">Affiliate Program</h2>
        <p className="text-lg text-gray-400 max-w-xl mb-8">
          Join our community of storytellers and earn commissions by sharing the
          magic of Everlore Hollow with your audience.
        </p>

        <div className="flex gap-4">
          <Link
            href="/sign-up"
            className="px-8 py-3 bg-[#d4af37] hover:bg-[#b8962e] text-[#1a0a2e] font-semibold rounded-lg transition-colors"
          >
            Apply Now
          </Link>
          <Link
            href="/sign-in"
            className="px-8 py-3 border border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/10 font-semibold rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>

        {/* Tier Preview */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
          <div className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6 text-left">
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">Initiate</h3>
            <p className="text-3xl font-bold text-white mb-2">10%</p>
            <p className="text-sm text-gray-400">Commission on all sales</p>
            <p className="text-xs text-gray-500 mt-2">Starting tier</p>
          </div>
          <div className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6 text-left">
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">Adept</h3>
            <p className="text-3xl font-bold text-white mb-2">15%</p>
            <p className="text-sm text-gray-400">Commission on all sales</p>
            <p className="text-xs text-gray-500 mt-2">6+ referrals</p>
          </div>
          <div className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6 text-left">
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">Inner Circle</h3>
            <p className="text-3xl font-bold text-white mb-2">20%</p>
            <p className="text-sm text-gray-400">Commission on all sales</p>
            <p className="text-xs text-gray-500 mt-2">16+ referrals</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-gray-500 text-sm border-t border-[#d4af37]/10">
        <p>&copy; {new Date().getFullYear()} Everlore Hollow. All rights reserved.</p>
      </footer>
    </div>
  );
}
