import { useEffect } from "react";
import { Link } from "react-router-dom";

const AppShell = () => {
  useEffect(() => {
    // Replace the whole page with the slouch app
    window.location.replace("/slouch-app/index.html");
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center space-y-4">
      <p className="text-lg">Loading SlouchApp…</p>
      <Link
        to="/"
        className="text-blue-500 underline hover:text-blue-700 transition"
      >
        ← Back to landing
      </Link>
    </div>
  );
};

export default AppShell;
