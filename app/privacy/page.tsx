import { LegalPage } from "@/components/LegalPage";
import { SITE_EMAIL } from "@/lib/site";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy Policy">
      <p>Effective date: September 15, 2026</p>
      <Section title="Information we process">
        We process account email and authentication details supplied through Supabase, optional display name and avatar, stories, comments, likes, follows, reports, and media you choose to upload. Anonymous stories are shown without your public name, but remain associated with your account for operation, moderation, and deletion.
      </Section>
      <Section title="How information is used">
        We use this information to operate accounts, publish and moderate stories, provide social features, respond to reports, prevent abuse, and provide support. We do not use story content to make factual claims about people or events.
      </Section>
      <Section title="Service providers">
        Supabase provides authentication and database/storage services. Cloudflare R2 stores large uploaded videos. Render hosts the application. Resend sends configured administrative notification emails. OpenAI may process text sent to the optional narrator feature when that feature is used. Browser push subscriptions are stored only when an administrator opts in to alerts.
      </Section>
      <Section title="Device data and local storage">
        The app uses browser cookies/session storage required by Supabase authentication and local browser storage where features require it. The codebase does not include advertising, cross-app tracking, or analytics SDKs. Hosting and service providers may process standard operational logs such as IP address, request metadata, and error information under their own service operation.
      </Section>
      <Section title="Retention and deletion">
        Account data and content are retained while your account is active or as needed for moderation and service operation. You can request in-app account deletion at <a className="text-amber-300" href="/account/delete">/account/delete</a>. This deletes your profile, authored stories, related media references, and associated large R2 video objects. Content created by other users, reports submitted about other content, and records required to respond to legal obligations may be retained only where necessary.
      </Section>
      <Section title="Your choices">
        You may post anonymously, manage your account, delete your own stories, block users, report content, and request privacy help at <a className="text-amber-300" href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a>.
      </Section>
      <Section title="Updates">
        We may update this policy as the service changes. The effective date above indicates the latest revision.
      </Section>
    </LegalPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-2 text-lg font-black text-white">{title}</h2><p>{children}</p></section>;
}
