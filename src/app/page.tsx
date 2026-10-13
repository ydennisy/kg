import { KnowledgeApp } from '@/components/knowledge/knowledge-app';
import { loadItems } from '@/lib/knowledge/load';

export const dynamic = 'force-dynamic';

export default async function Home() {
  return <KnowledgeApp items={await loadItems()} />;
}
