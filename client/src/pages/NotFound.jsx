import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-slate-500">
      <p className="text-lg font-medium">Page not found</p>
      <Link to="/" className="text-indigo-600 hover:underline">
        Go home
      </Link>
    </div>
  );
}
