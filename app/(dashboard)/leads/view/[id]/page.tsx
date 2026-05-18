import LeadViewPageClient from './LeadViewPageClient';
import { MOCK_LEADS } from '@/lib/mockData';

export function generateStaticParams() {
  return MOCK_LEADS.map((l) => ({ id: l.id }));
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <LeadViewPageClient params={params} />;
}
