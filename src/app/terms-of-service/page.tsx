import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Ascendant",
  description: "Terms of Service for Ascendant - rules and guidelines for using our platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="container max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: January 20, 2026</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By accessing or using Ascendant (&quot;the Service&quot;), you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use our Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
          <p className="text-muted-foreground">
            Ascendant is a fitness tracking platform that allows athletes to complete challenges, earn XP, 
            progress through ranks, and connect with gyms and other athletes. The Service includes web applications, 
            APIs, and related services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
          <p className="text-muted-foreground mb-3">To use certain features, you must create an account. You agree to:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Be responsible for all activities under your account</li>
          </ul>
          <p className="text-muted-foreground mt-3">
            Users under 18 must have a parent or guardian create and manage their account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. User Content</h2>
          <p className="text-muted-foreground mb-3">
            You retain ownership of content you submit (videos, images, comments). By submitting content, you grant us a 
            non-exclusive, worldwide, royalty-free license to use, display, and distribute your content in connection 
            with the Service.
          </p>
          <p className="text-muted-foreground">You agree not to submit content that:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Is illegal, harmful, or violates others&apos; rights</li>
            <li>Contains nudity, violence, or offensive material</li>
            <li>Is fraudulent or misleading</li>
            <li>Infringes on intellectual property rights</li>
            <li>Contains malware or harmful code</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Challenge Submissions</h2>
          <p className="text-muted-foreground mb-3">When submitting challenge completions:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>All submissions must be genuine and performed by you</li>
            <li>Video/image proof must accurately represent your attempt</li>
            <li>Manipulated or falsified submissions are prohibited</li>
            <li>We reserve the right to reject or revoke submissions</li>
            <li>XP and achievements may be adjusted if fraud is detected</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Gym Owners and Coaches</h2>
          <p className="text-muted-foreground mb-3">If you register as a gym owner or coach:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>You must have authority to represent the gym</li>
            <li>You are responsible for managing your gym&apos;s members and classes</li>
            <li>You must comply with applicable laws regarding minors</li>
            <li>You agree to our data processing on behalf of your members</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Third-Party Integrations</h2>
          <p className="text-muted-foreground">
            The Service integrates with third-party platforms (Strava, Garmin, Google). Your use of these integrations 
            is subject to the respective third party&apos;s terms of service. We are not responsible for third-party 
            services or their availability.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Prohibited Conduct</h2>
          <p className="text-muted-foreground mb-3">You agree not to:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Use the Service for any illegal purpose</li>
            <li>Harass, bully, or intimidate other users</li>
            <li>Attempt to gain unauthorized access to the Service</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Use automated systems to access the Service without permission</li>
            <li>Impersonate another person or entity</li>
            <li>Share your account with others</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. Intellectual Property</h2>
          <p className="text-muted-foreground">
            The Service, including its design, features, and content (excluding user content), is owned by Ascendant 
            and protected by intellectual property laws. You may not copy, modify, or distribute our intellectual 
            property without permission.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">10. Disclaimer of Warranties</h2>
          <p className="text-muted-foreground">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE THAT THE SERVICE 
            WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. USE THE SERVICE AT YOUR OWN RISK.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">11. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, ASCENDANT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">12. Physical Activity Disclaimer</h2>
          <p className="text-muted-foreground">
            Ascendant tracks fitness challenges that involve physical activity. You acknowledge that physical exercise 
            carries inherent risks. Consult a healthcare provider before beginning any exercise program. We are not 
            responsible for any injuries resulting from challenge attempts.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">13. Termination</h2>
          <p className="text-muted-foreground">
            We may suspend or terminate your account at any time for violations of these terms or for any other reason. 
            You may delete your account at any time through your account settings or by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">14. Changes to Terms</h2>
          <p className="text-muted-foreground">
            We may modify these terms at any time. We will notify users of material changes via email or through the 
            Service. Continued use after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">15. Governing Law</h2>
          <p className="text-muted-foreground">
            These terms are governed by the laws of the State of Texas, United States, without regard to conflict 
            of law principles.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">16. Contact Us</h2>
          <p className="text-muted-foreground">
            If you have any questions about these Terms of Service, please contact us at{" "}
            <a href="mailto:legal@ascendant.fit" className="text-primary hover:underline">
              legal@ascendant.fit
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
