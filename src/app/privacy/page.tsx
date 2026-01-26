import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Ascendant",
  description: "Privacy Policy for Ascendant - how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: January 20, 2026</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
          <p className="text-muted-foreground">
            Welcome to Ascendant (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy 
            and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard 
            your information when you use our fitness tracking platform and services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
          <p className="text-muted-foreground mb-3">We collect information you provide directly to us, including:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Account information (name, email address, username, profile photo)</li>
            <li>Fitness data (challenge submissions, achievements, workout videos/images)</li>
            <li>Profile information (age, gender for division placement)</li>
            <li>Communications you send to us</li>
          </ul>
          <p className="text-muted-foreground mt-3">We automatically collect certain information when you use our services:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Device and browser information</li>
            <li>IP address and location data</li>
            <li>Usage data and analytics</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Third-Party Services</h2>
          <p className="text-muted-foreground mb-3">
            We integrate with third-party services to enhance your experience:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li><strong>Strava:</strong> If you connect your account, we access activity data (distance, time, route) to verify challenge completions.</li>
            <li><strong>Google Sign-In:</strong> We use Google for authentication. We receive your name, email, and profile picture.</li>
            <li><strong>Clerk:</strong> Our authentication provider that securely manages your login credentials.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. How We Use Your Information</h2>
          <p className="text-muted-foreground mb-3">We use the information we collect to:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Provide, maintain, and improve our services</li>
            <li>Track your fitness progress and achievements</li>
            <li>Display leaderboards and community features</li>
            <li>Send you notifications about your account and achievements</li>
            <li>Respond to your comments and questions</li>
            <li>Detect and prevent fraud or abuse</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Information Sharing</h2>
          <p className="text-muted-foreground mb-3">
            We do not sell your personal information. We may share your information in the following circumstances:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>With your consent or at your direction</li>
            <li>With gym owners/coaches if you join their gym on the platform</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights, privacy, safety, or property</li>
            <li>In connection with a merger, acquisition, or sale of assets</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
          <p className="text-muted-foreground">
            We retain your information for as long as your account is active or as needed to provide you services. 
            You may request deletion of your account and associated data at any time by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Your Privacy Controls</h2>
          <p className="text-muted-foreground mb-3">You have control over your information:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Set your feed visibility to Public, Followers Only, or Private</li>
            <li>Choose whether to share exact achievement values</li>
            <li>Disconnect third-party integrations at any time</li>
            <li>Request a copy of your data or account deletion</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Children&apos;s Privacy</h2>
          <p className="text-muted-foreground">
            Athletes under 18 are designated as minors and have additional privacy protections. 
            Parent/guardian accounts can manage minor athlete profiles and control their visibility settings.
            Minor accounts default to more restrictive privacy settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. Security</h2>
          <p className="text-muted-foreground">
            We implement appropriate technical and organizational measures to protect your personal information. 
            However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
          <p className="text-muted-foreground">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
            the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
          <p className="text-muted-foreground">
            If you have any questions about this Privacy Policy, please contact us at{" "}
            <a href="mailto:privacy@ascendant.fit" className="text-primary hover:underline">
              privacy@ascendant.fit
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
