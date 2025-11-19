export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow rounded-lg p-8">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="text-sm text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing and using Post Meeting Content Generator (&quot;the Service&quot;), you accept and agree 
            to be bound by the terms and provision of this agreement. If you do not agree to these terms, 
            please do not use the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
          <p className="mb-4">
            Post Meeting Content Generator is a service that:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Syncs with your Google Calendar to display upcoming meetings</li>
            <li>Schedules meeting notetakers via Recall.ai</li>
            <li>Generates AI-powered social media posts and follow-up emails from meeting transcripts</li>
            <li>Posts content to your connected social media accounts (LinkedIn, Facebook)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
          <p className="mb-4">
            To use the Service, you must:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Be at least 13 years of age</li>
            <li>Have a valid Google account</li>
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized use</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. User Responsibilities</h2>
          <p className="mb-4">You agree to:</p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Use the Service only for lawful purposes</li>
            <li>Not share your account credentials with others</li>
            <li>Review all generated content before posting to social media</li>
            <li>Ensure you have permission to post content on behalf of any organizations you represent</li>
            <li>Comply with all applicable laws and regulations</li>
            <li>Not use the Service to post spam, offensive, or illegal content</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Third-Party Services</h2>
          <p className="mb-4">
            The Service integrates with third-party services including:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Google Calendar (for calendar data)</li>
            <li>Recall.ai (for meeting transcription)</li>
            <li>LinkedIn and Facebook (for social media posting)</li>
            <li>Google Gemini API (for AI content generation)</li>
          </ul>
          <p className="mb-4">
            Your use of these services is subject to their respective terms of service and privacy policies. 
            We are not responsible for the practices of these third-party services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Content and Intellectual Property</h2>
          <p className="mb-4">
            You retain ownership of all content you provide to the Service, including meeting transcripts 
            and generated posts. By using the Service, you grant us a license to process, store, and 
            transmit your content as necessary to provide the Service.
          </p>
          <p className="mb-4">
            AI-generated content is provided &quot;as-is&quot; and you are responsible for reviewing and approving 
            all content before posting to social media.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Prohibited Uses</h2>
          <p className="mb-4">You may not:</p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Use the Service for any illegal or unauthorized purpose</li>
            <li>Violate any laws in your jurisdiction</li>
            <li>Transmit any viruses, malware, or harmful code</li>
            <li>Attempt to gain unauthorized access to the Service</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Use the Service to spam or harass others</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Service Availability</h2>
          <p className="mb-4">
            We strive to provide reliable service but do not guarantee uninterrupted or error-free operation. 
            The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond 
            our control.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
          <p className="mb-4">
            To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, 
            special, consequential, or punitive damages, or any loss of profits or revenues, whether 
            incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Indemnification</h2>
          <p className="mb-4">
            You agree to indemnify and hold harmless Post Meeting Content Generator and its operators 
            from any claims, damages, losses, liabilities, and expenses arising out of your use of the 
            Service or violation of these Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
          <p className="mb-4">
            We reserve the right to terminate or suspend your account and access to the Service at any 
            time, with or without cause or notice, for any reason including violation of these Terms.
          </p>
          <p className="mb-4">
            You may delete your account and data at any time through the Settings page.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
          <p className="mb-4">
            We reserve the right to modify these Terms at any time. We will notify users of any material 
            changes by posting the updated Terms on this page. Your continued use of the Service after 
            such changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
          <p className="mb-4">
            These Terms shall be governed by and construed in accordance with applicable laws, without 
            regard to conflict of law provisions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
          <p className="mb-4">
            If you have questions about these Terms of Service, please contact us through the app 
            settings or your account dashboard.
          </p>
        </section>
      </div>
    </div>
  )
}

