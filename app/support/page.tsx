import { LegalPage } from "@/components/LegalPage";
import { SITE_EMAIL } from "@/lib/site";

export const metadata = { title: "Support" };

export default function SupportPage() {
  return (
    <LegalPage eyebrow="Help" title="Support">
      <p>Contact <a className="font-semibold text-amber-300" href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a> for Last Storyteller support.</p>
      <Section title="Technical problems">Include your device, browser or app version, what happened, and any error message. Do not email passwords or other secrets.</Section>
      <Section title="Abusive content">Use the Report action on the relevant story first so moderators receive the story and reason. For urgent follow-up, email the link and details to support.</Section>
      <Section title="Copyright or privacy concerns">Email the content URL, your contact information, the basis for the request, and enough detail for us to investigate.</Section>
      <Section title="Account and privacy">You can delete your account in <a className="text-amber-300" href="/account/delete">Account deletion</a>. For privacy questions or help with deletion, email support.</Section>
      <Section title="Feedback">We welcome product feedback at the same address.</Section>
    </LegalPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-2 text-lg font-black text-white">{title}</h2><p>{children}</p></section>;
}
