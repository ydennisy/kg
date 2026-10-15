import { KnowledgeApp } from '@/components/knowledge/knowledge-app';
import { requireUser } from '@/lib/auth';
import { loadItems } from '@/lib/knowledge/load';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await requireUser();
  return <KnowledgeApp items={await loadItems(user.id)} />;
}
