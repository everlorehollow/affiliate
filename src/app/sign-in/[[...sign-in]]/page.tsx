import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#1a0a2e] border border-[#d4af37]/20",
            headerTitle: "text-[#d4af37]",
            headerSubtitle: "text-gray-400",
            formButtonPrimary: "bg-[#d4af37] hover:bg-[#b8962e] text-[#1a0a2e]",
            formFieldInput: "bg-[#2c0046] border-[#d4af37]/30 text-white",
            formFieldLabel: "text-gray-300",
            footerActionLink: "text-[#d4af37] hover:text-[#b8962e]",
          },
        }}
        afterSignInUrl="/dashboard"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
