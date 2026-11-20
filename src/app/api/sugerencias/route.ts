import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { isPublic } from '@/lib/services/catalog';

const { products: p, stores: s, categories } = schema;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim().slice(0, 60) ?? '';
  if (q.length < 2) return Response.json([]);
  const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
  const [prods, cats] = await Promise.all([
    db.select({ title: p.title, slug: p.slug }).from(p).innerJoin(s, eq(s.id, p.storeId))
      .where(and(isPublic, or(sql`${p.searchVector} @@ websearch_to_tsquery('spanish', immutable_unaccent(${q}))`, sql`word_similarity(immutable_unaccent(lower(${q})), immutable_unaccent(lower(${p.title}))) >= 0.45`, ilike(p.title, like))))
      .orderBy(desc(p.salesCount)).limit(6),
    db.select({ name: categories.name, slug: categories.slug }).from(categories).where(and(eq(categories.active, true), sql`immutable_unaccent(lower(${categories.name})) like immutable_unaccent(lower(${like}))`)).limit(3),
  ]);
  return Response.json(
    [
      ...cats.map((c) => ({ type: 'category', label: c.name, href: `/categoria/${c.slug}` })),
      ...prods.map((x) => ({ type: 'product', label: x.title, href: `/producto/${x.slug}` })),
    ],
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  );
}
