import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-black font-sans">
      <main className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <h1 className="text-6xl font-black tracking-tighter sm:text-8xl">
          Vyora
        </h1>
        <p className="mt-6 max-w-xl text-lg text-gray-600 sm:text-xl">
          A minimalist trip planner. Keep your itineraries organized, simple, and beautifully clean.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-6">
          <Link
            className="flex h-12 items-center justify-center bg-black px-8 font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            href="/dashboard"
          >
            Go to Dashboard
          </Link>
          <Link
            className="flex h-12 items-center justify-center border border-gray-300 bg-white px-8 font-medium text-black transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            href="/login"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
