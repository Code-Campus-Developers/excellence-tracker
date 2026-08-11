import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy | Code Campus Excellence Tracker" }] }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-semibold text-sm text-foreground hover:underline">
            ← Code Campus Excellence Tracker
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: August 2026
        </p>

        <section className="space-y-8 text-sm leading-7 text-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Overview</h2>
            <p>
              Code Campus Excellence Tracker ("the Platform") is operated by Code Campus International.
              This Privacy Policy explains how we collect, use, and protect information when you use our platform.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Information We Collect</h2>
            <p>We collect the following information:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Name, email address, and phone number (provided during registration)</li>
              <li>Google account information (if you sign in with Google — name, email, and profile picture)</li>
              <li>Attendance records (clock-in and clock-out times)</li>
              <li>Weekly evaluation scores and performance data</li>
              <li>Self-report submissions and learning activity records</li>
              <li>Profile pictures uploaded by users</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. How We Use Your Information</h2>
            <p>Your information is used to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Provide access to your student, instructor, or parent dashboard</li>
              <li>Record and display weekly evaluation scores and attendance</li>
              <li>Send email notifications about evaluations, attendance, and reports</li>
              <li>Allow parents to monitor their child's academic performance</li>
              <li>Enable QR code-based attendance tracking</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Google OAuth</h2>
            <p>
              If you choose to sign in with Google, we access only your basic profile information (name, email
              address, and profile picture). We do not access your Google Drive, Gmail, contacts, or any other
              Google services. Your Google credentials are never stored on our servers.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Data Sharing</h2>
            <p>
              We do not sell or share your personal data with third parties for marketing purposes.
              Data is shared only:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>With your linked parent (attendance, evaluation scores, and report status)</li>
              <li>With your assigned instructor (for evaluation purposes)</li>
              <li>With Code Campus administrators (for platform management)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Data Storage &amp; Security</h2>
            <p>
              All data is stored securely on encrypted servers. We use industry-standard security practices
              including HTTPS, JWT authentication, and bcrypt password hashing. Profile pictures are stored
              on Cloudinary's secure cloud storage.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. You may contact Code Campus
              administrators to request deletion of your account and associated data.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account</li>
              <li>Withdraw consent for data processing at any time</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:{" "}
              <a href="mailto:excellence@codecampus.com.ng" className="text-green-700 underline">
                excellence@codecampus.com.ng
              </a>
            </p>
          </div>
        </section>
      </div>

      <footer className="border-t py-6 text-center text-sm text-gray-400 mt-8">
        © {new Date().getFullYear()} Code Campus International. All rights reserved.
      </footer>
    </div>
  );
}
