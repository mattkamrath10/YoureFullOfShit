import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Community Guidelines" };

export default function CommunityGuidelinesPage() {
  return (
    <LegalPage eyebrow="Safety" title="Community Guidelines">
      <p>Last Storyteller is for sharing stories, not harming people. Keep contributions lawful, respectful, and safe.</p>
      <Section title="Never post">Pornography; sexual exploitation; child sexual abuse material; threats; bullying; harassment; hate or discrimination; non-consensual intimate imagery; violent threats; dangerous or illegal instructions; doxxing; personal information intended to harm; fraud; spam; malware; impersonation; or copyright-infringing material.</Section>
      <Section title="Stories and evidence">Only share material you have the right to share. Do not present private information, fabricated allegations, or misleading content as a way to harm another person. Anonymous posting does not exempt content from these rules.</Section>
      <Section title="Reports, blocks, and moderation">Use the Report action on a story to flag violations and the Block action to stop seeing or interacting with an abusive account. Moderators review reports and may remove or restrict content, limit accounts, or terminate accounts for violations.</Section>
      <Section title="Emergency situations">Do not use Last Storyteller for emergencies or immediate safety concerns. Contact local emergency services or an appropriate crisis resource instead.</Section>
    </LegalPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-2 text-lg font-black text-white">{title}</h2><p>{children}</p></section>;
}
