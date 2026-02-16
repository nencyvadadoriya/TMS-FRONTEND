import { Link } from "react-router";
import { routepath } from "../Routes/route";

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-8 py-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Terms & Conditions
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
                to={routepath.privacyPolicy}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
              >
                Privacy Policy
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
              <h2 className="text-base font-semibold text-gray-900">Acceptance</h2>
              <p>
                By accessing or using this Task Management System (the “App”), you agree to
                these Terms & Conditions. If you do not agree, do not use the App.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">Account</h2>
              <p className="text-gray-700">
                You are responsible for maintaining the confidentiality of your account and
                for all activities under your account.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">Permitted use</h2>
              <p className="text-gray-700">You agree not to:</p>
              <ul className="list-disc pl-5 text-gray-700">
                <li>Use the App for unlawful activities</li>
                <li>Attempt to gain unauthorized access to systems or data</li>
                <li>Interfere with the security or performance of the App</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">
                Google integrations
              </h2>
              <p className="text-gray-700">
                If you connect Google services, you authorize the App to access Google
                Calendar and Google Tasks data as needed to provide the features you request.
                You can revoke access at any time from your Google Account permissions.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">Availability</h2>
              <p className="text-gray-700">
                We may modify, suspend, or discontinue the App (in whole or in part) at any
                time without notice.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">
                Disclaimer of warranties
              </h2>
              <p className="text-gray-700">
                The App is provided “as is” and “as available” without warranties of any kind.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">
                Limitation of liability
              </h2>
              <p className="text-gray-700">
                To the maximum extent permitted by law, we are not liable for any indirect,
                incidental, special, or consequential damages arising from your use of the App.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">Changes</h2>
              <p className="text-gray-700">
                We may update these Terms from time to time. Continued use of the App after
                changes become effective constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">Contact</h2>
              <p className="text-gray-700">
                If you have questions about these Terms, contact the app administrator.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
