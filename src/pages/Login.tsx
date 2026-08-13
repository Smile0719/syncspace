import React, { useState } from "react";

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function Login({ onSuccess, onCancel }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder: integrate real auth backend here
    console.log("Login attempt", { email, password });
    if (onSuccess) onSuccess();
    else {
      window.history.replaceState({}, "", "/");
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow p-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Sign in to SyncSpace</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-md text-sm"
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={() => {
                if (onCancel) onCancel();
                else window.history.back();
              }}
              className="text-sm text-gray-600 hover:underline"
            >
              Cancel
            </button>
          </div>

          <div className="text-sm text-gray-600">
            No account?{' '}
            <a
              className="text-violet-600 hover:underline cursor-pointer"
              onClick={() => {
                window.history.pushState({}, '', '/register');
                window.location.reload();
              }}
            >
              Create one
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
