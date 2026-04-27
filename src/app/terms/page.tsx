import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — DrawLint.ai",
  description: "Terms and conditions for using DrawLint.ai.",
};

export default function TermsOfServicePage() {
  const lastUpdated = "April 26, 2026";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Home
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using DrawLint.ai (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>
              DrawLint.ai is an AI-powered system design review platform that allows users to create
              architecture diagrams, submit them for automated AI review, respond to feedback, and practice
              for system design interviews.
            </p>
          </section>

          <section>
            <h2>3. User Accounts</h2>
            <ul>
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must be at least 13 years old to use the Service.</li>
              <li>One person may not maintain more than one account.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
            </ul>
          </section>

          <section>
            <h2>4. User Content</h2>
            <ul>
              <li>You retain ownership of the design diagrams and text you create on DrawLint.ai.</li>
              <li>By submitting designs for review, you grant us a limited license to process your content through our AI pipeline for the purpose of providing the Service.</li>
              <li>Designs submitted to the public library are visible to all authenticated users.</li>
              <li>You must not submit content that is illegal, harmful, threatening, abusive, defamatory, or otherwise objectionable.</li>
              <li>You must not submit proprietary or confidential system designs belonging to your employer without authorization.</li>
            </ul>
          </section>

          <section>
            <h2>5. Weekly Challenge Rules</h2>
            <ul>
              <li>Weekly challenge submissions are <strong>final</strong> and cannot be deleted or re-evaluated.</li>
              <li>Each user is limited to <strong>one submission per challenge</strong>.</li>
              <li>Leaderboard rankings are determined by AI-generated hire signals and submission time.</li>
              <li>DrawLint reserves the right to modify challenge rules, scoring criteria, or frequency at any time.</li>
            </ul>
          </section>

          <section>
            <h2>6. AI-Generated Content</h2>
            <p>
              DrawLint.ai provides AI-generated reviews and feedback on your system designs. Please note:
            </p>
            <ul>
              <li>AI reviews are <strong>automated suggestions</strong> and should not be treated as professional engineering advice.</li>
              <li>AI-generated feedback may contain inaccuracies, biases, or errors.</li>
              <li>You should <strong>use your own judgment</strong> when interpreting AI review results.</li>
              <li>We do not guarantee the accuracy, completeness, or reliability of any AI-generated content.</li>
              <li>Hire signal verdicts (Strong Hire, Hire, Lean Hire, etc.) are for practice purposes only and do not reflect actual interview outcomes.</li>
            </ul>
          </section>

          <section>
            <h2>7. Bring Your Own API Keys</h2>
            <ul>
              <li>If you connect your own AI provider (Gemini, Azure OpenAI), you are responsible for compliance with that provider&apos;s terms of service.</li>
              <li>Your API keys are stored in your browser and transmitted to our server only during analysis. We do not store your keys on our servers.</li>
              <li>You are responsible for any charges incurred on your own AI provider accounts.</li>
              <li>We are not liable for any issues arising from the use of third-party AI providers.</li>
            </ul>
          </section>

          <section>
            <h2>8. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose.</li>
              <li>Attempt to gain unauthorized access to any part of the Service.</li>
              <li>Interfere with or disrupt the Service or servers.</li>
              <li>Use automated tools to scrape or extract data from the Service.</li>
              <li>Submit deliberately malicious, abusive, or spam content.</li>
              <li>Attempt to circumvent rate limits or usage quotas.</li>
              <li>Impersonate another person or entity.</li>
            </ul>
          </section>

          <section>
            <h2>9. Free Tier & Usage Limits</h2>
            <ul>
              <li>The free tier includes a limited number of AI reviews per month using DrawLint AI.</li>
              <li>We reserve the right to modify usage limits at any time.</li>
              <li>Abuse of free tier limits may result in account suspension.</li>
            </ul>
          </section>

          <section>
            <h2>10. Intellectual Property</h2>
            <ul>
              <li>The DrawLint.ai name, logo, and branding are our property.</li>
              <li>The Service&apos;s source code is publicly available under the BSL 1.1 License on GitHub.</li>
              <li>AI evaluation prompts and review criteria are proprietary to DrawLint.ai.</li>
            </ul>
          </section>

          <section>
            <h2>11. Disclaimer of Warranties</h2>
            <p>
              The Service is provided <strong>&quot;as is&quot;</strong> and <strong>&quot;as available&quot;</strong> without warranties of any kind,
              either express or implied. We do not warrant that the Service will be uninterrupted,
              error-free, or secure. We make no warranties about the accuracy or reliability of AI-generated content.
            </p>
          </section>

          <section>
            <h2>12. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, DrawLint.ai shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, including but not limited to loss of
              profits, data, or other intangible losses, arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2>13. Account Termination</h2>
            <ul>
              <li>You may delete your account at any time through Settings.</li>
              <li>We may suspend or terminate accounts that violate these Terms.</li>
              <li>Upon termination, your data will be deleted in accordance with our <Link href="/privacy" className="text-violet-400 hover:underline">Privacy Policy</Link>.</li>
            </ul>
          </section>

          <section>
            <h2>14. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be communicated by posting
              the updated terms on this page. Continued use of the Service after changes constitutes acceptance
              of the updated terms.
            </p>
          </section>

          <section>
            <h2>15. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India,
              without regard to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2>16. Contact</h2>
            <p>
              Questions about these Terms? Contact us at:{" "}
              <a href="mailto:drawlint.ai.support@gmail.com" className="text-violet-400 hover:underline">drawlint.ai.support@gmail.com</a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 border-t border-border pt-8 text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-3">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span className="text-muted-foreground/30">·</span>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <span className="text-muted-foreground/30">·</span>
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
