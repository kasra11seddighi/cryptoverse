import { Link } from "react-router-dom";
import { PATHS } from "@/app/router/paths";

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-ink-muted">The page you are looking for does not exist.</p>
      <Link to={PATHS.overview} className="mt-4 inline-block text-accent hover:underline">
        Back to overview
      </Link>
    </main>
  );
}
