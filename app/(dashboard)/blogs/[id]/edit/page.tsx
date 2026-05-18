import EditBlogPageClient from './EditBlogPageClient';
import { MOCK_BLOGS } from '@/lib/mockData';

export function generateStaticParams() {
  return MOCK_BLOGS.map((b) => ({ id: b.id }));
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <EditBlogPageClient params={params} />;
}
