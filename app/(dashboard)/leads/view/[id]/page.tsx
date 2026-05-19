import LeadViewPageClient from './LeadViewPageClient';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <LeadViewPageClient params={params} />;
}
