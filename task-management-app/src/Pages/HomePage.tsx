import { Link } from "react-router";
import { routepath } from "../Routes/route";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <meta name="google-site-verification" content="q6BGcMT3Zm73tNhpI7jgiMo1LfAe78tMQ8z2kdij88M" />
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-8 py-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Task Management System
              </h1>
              <p className="text-sm text-gray-600">
                Manage work, calendars, and tasks in one place.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={routepath.login}
                className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800"
              >
                Login
              </Link>
              <Link
                to={routepath.privacyPolicy}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
              >
                Privacy Policy
              </Link>
              <Link
                to={routepath.termsAndConditions}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
              >
                Terms & Conditions
              </Link>
            </div>
          </div>

          <div className="px-8 py-10">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900">What this app does</h2>
                <p className="text-sm leading-6 text-gray-700">
                  This application helps you organize your work by creating and tracking tasks,
                  scheduling activities, and reviewing progress.
                </p>
                <p className="text-sm leading-6 text-gray-700">
                  It can integrate with your Google account to show calendar events and tasks
                  that you choose to connect.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Why Google access is requested
                </h2>
                <p className="text-sm leading-6 text-gray-700">
                  If you sign in with Google and grant permission, the app uses:
                </p>
                <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-sm font-semibold text-gray-900">Google Calendar API</div>
                  <div className="text-sm text-gray-700">
                    To view and manage your calendar data within the app.
                  </div>
                  <div className="mt-3 text-sm font-semibold text-gray-900">Google Tasks API</div>
                  <div className="text-sm text-gray-700">
                    To view and manage your tasks within the app.
                  </div>
                </div>
                <p className="text-xs leading-5 text-gray-600">
                  You can revoke access at any time from your Google Account permissions.
                </p>
              </div>
            </div>

            <div className="mt-10 rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900">Contact</h3>
              <p className="mt-2 text-sm text-gray-700">
                If you have any questions, contact the app administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
