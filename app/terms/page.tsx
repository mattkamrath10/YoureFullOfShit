import { LegalPage } from "@/components/LegalPage";
import { SITE_EMAIL } from "@/lib/site";

export const metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of Use">
      <p>Effective date: September 15, 2026</p>
      <Section title="Using Last Storyteller">You must be old enough to use the service under applicable law and may not use it if you are barred from doing so. Keep your account credentials secure and provide accurate account information.</Section>
      <Section title="Your content">You retain ownership of content you submit. You grant Last Storyteller the limited license needed to host, display, moderate, reproduce, and distribute that content through the service. You are responsible for having the rights and permissions needed to submit it.</Section>
      <Section title="Prohibited content and conduct">Do not submit illegal content, threats, harassment, hate, pornography, sexual exploitation, child sexual abuse material, non-consensual intimate imagery, doxxing, fraud, spam, malware, impersonation, copyright infringement, or content that endangers people. Do not attempt unauthorized access or manipulate the service.</Section>
      <Section title="Moderation">We may review, restrict, remove, or decline content and may suspend or terminate accounts that violate these Terms or the Community Guidelines. Users can report content and block users; reporting does not guarantee immediate removal.</Section>
      <Section title="Third-party services">The service relies on providers including Supabase, Cloudflare R2, Render, Resend, and optional OpenAI narration. Their services are governed by their own terms and policies.</Section>
      <Section title="Disclaimers and liability">Last Storyteller is a user-generated storytelling service. User content may be inaccurate, offensive, or unavailable. To the extent allowed by law, the service is provided as-is and liability is limited to the extent permitted by law.</Section>
      <Section title="Changes and contact">We may update these Terms. Questions, copyright concerns, or notices may be sent to <a className="text-amber-300" href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a>. Governing-law and business-entity details must be completed before launch where legally required.</Section>
    </LegalPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-2 text-lg font-black text-white">{title}</h2><p>{children}</p></section>;
}
