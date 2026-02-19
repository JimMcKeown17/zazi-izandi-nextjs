import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-primary tracking-tight">
          Zazi iZandi
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Sign in to access staff resources
        </p>
      </div>

      <SignIn />

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
