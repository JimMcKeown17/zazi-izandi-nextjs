import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Brand header bar */}
        <div className="bg-primary text-white text-center py-5 px-6 rounded-t-xl">
          <h1 className="text-2xl font-bold tracking-tight">Zazi iZandi</h1>
          <p className="text-sm text-white/80 mt-1">
            Sign in to access staff resources
          </p>
        </div>

        {/* Clerk SignIn component — card styling merges with the bar above */}
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "rounded-t-none rounded-b-xl shadow-lg border-0",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
            },
          }}
        />
      </div>

      <p className="mt-6 text-sm text-gray-500">
        Need access?{" "}
        <a
          href="mailto:info@zaziizandi.org"
          className="text-primary hover:underline"
        >
          Contact the team
        </a>
      </p>
    </main>
  );
}
