import { Link } from "react-router";
import { routepath } from "../Routes/route";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-8 py-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Privacy Policy
              </h1>
              <p className="text-sm text-gray-600">
                Effective date: {new Date().getFullYear()}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to={routepath.home}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
              >
                Home
              </Link>
              <Link
                to={routepath.termsAndConditions}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
              >
                Terms & Conditions
              </Link>
              <Link
                to={routepath.login}
                className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800"
              >
                Login
              </Link>
            </div>
          </div>

          <div className="space-y-8 px-8 py-8 text-sm leading-6 text-gray-800">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">Overview</h2>
              <p>
                This Privacy Policy explains how the Task Management System (the “App”)
                collects, uses, and protects information when you use the App, including
                when you connect your Google account for Google Calendar and Google Tasks
                functionality.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">
                Information we collect
              </h2>
              <div className="space-y-2">
                <div>
                  <div className="font-semibold text-gray-900">Account & profile data</div>
                  <div className="text-gray-700">
                    Information you provide such as name, email address, and authentication
                    tokens required to sign in.
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    Google Calendar & Google Tasks data (with your consent)
                  </div>
                  <div className="text-gray-700">
                    If you connect your Google account, the App may access data from Google
                    Calendar and Google Tasks to display and manage your events and tasks
                    inside the App.
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Usage data</div>
                  <div className="text-gray-700">
                    Basic app usage information (such as feature usage and error logs) to
                    improve reliability and performance.
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">
                How we use information
              </h2>
              <p className="text-gray-700">
                We use information to:
              </p>
              <ul className="list-disc pl-5 text-gray-700">
                <li>Provide and maintain the App and its features</li>
                <li>Authenticate you and secure access to your account</li>
                <li>Display and manage your calendar events and tasks (if enabled by you)</li>
                <li>Improve performance, fix bugs, and enhance user experience</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">
                Google API Services usage
              </h2>
              <p className="text-gray-700">
                The App uses Google API Services (Google Calendar API and Google Tasks API).
                Information received from Google APIs is used only to provide features you
                request within the App.
              </p>
              <p className="text-gray-700">
                You can revoke the App’s access to your Google Account at any time from your
                Google Account permissions.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">
                Data sharing
              </h2>
              <p className="text-gray-700">
                We do not sell your personal information. We may share information only when
                required to operate the service (for example, with hosting providers) or when
                required by law.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">
                Data retention
              </h2>
              <p className="text-gray-700">
                We retain information only for as long as needed to provide the App and meet
                legal or operational requirements. Where applicable, you may request deletion
                of your account data.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">Security</h2>
              <p className="text-gray-700">
                We take reasonable measures to protect information, but no method of
                transmission or storage is completely secure.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">Contact</h2>
              <p className="text-gray-700">
                If you have questions about this Privacy Policy, contact the app
                administrator.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
