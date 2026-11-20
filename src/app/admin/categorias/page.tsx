import { asc, sql } from 'drizzle-orm';
import { FolderTree } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { db, schema } from '@/lib/db';
import { deleteCategoryAction, saveCategoryAction } from '@/actions/admin';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { Checkbox, Field, Input, Select } from '@/components/ui/form';
import { Badge, EmptyState, PageHeader } from '@/components/ui/misc';
import { ConfirmAction, PublicLink, Section } from '@/components/admin/ui';
import { buttonClass } from '@/components/ui/button';

const { categories, products } = schema;
type Cat = { id: number; name: string; slug: string; parentId: number | null; position: number; active: boolean; products: number };

function CategoryForm({ cat, parents }: { cat?: Cat; parents: Cat[] }) {
  const k = cat?.id ?? 'new';
  return (
    <ActionForm action={saveCategoryAction.bind(null, cat?.id ?? null)} resetOnSuccess={!cat} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_6rem_auto] lg:items-end">
      <Field label="Nombre" htmlFor={`name-${k}`}><Input id={`name-${k}`} name="name" defaultValue={cat?.name} required minLength={2} maxLength={60} /></Field>
      <Field label="Slug" htmlFor={`slug-${k}`}><Input id={`slug-${k}`} name="slug" defaultValue={cat?.slug} placeholder="Se genera del nombre" maxLength={80} /></Field>
      <Field label="Categoría principal" htmlFor={`parent-${k}`}>
        <Select id={`parent-${k}`} name="parentId" defaultValue={cat?.parentId ?? ''}>
          <option value="">— Ninguna (principal) —</option>
          {parents.filter((p) => p.id !== cat?.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </Field>
      <Field label="Posición" htmlFor={`pos-${k}`}><Input id={`pos-${k}`} name="position" type="number" defaultValue={cat?.position ?? 0} /></Field>
      <div className="flex items-center gap-3 lg:h-10">
        <Checkbox name="active" defaultChecked={cat?.active ?? true} label="Activa" />
        <SubmitButton size="sm">{cat ? 'Guardar' : 'Crear'}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function Row({ cat, parents, child }: { cat: Cat; parents: Cat[]; child?: boolean }) {
  return (
    <li className={child ? 'border-t border-line pl-6 sm:pl-10' : 'border-t border-line first:border-t-0'}>
      <details className="group">
        <summary className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-subtle/60">
          <span className={child ? 'text-sm' : 'text-sm font-semibold'}>{cat.name}</span>
          <span className="font-mono text-xs text-faint">{cat.slug}</span>
          {!cat.active && <Badge>Inactiva</Badge>}
          <span className="ml-auto flex items-center gap-3 text-xs text-muted tabular-nums">
            <span>{cat.products} productos</span><span>pos. {cat.position}</span>
            <span className={buttonClass('ghost', 'sm', 'h-7 group-open:bg-subtle')}>Editar</span>
          </span>
        </summary>
        <div className="space-y-3 border-t border-line bg-subtle/40 px-4 py-4">
          <CategoryForm cat={cat} parents={parents} />
          <div className="flex flex-wrap items-center gap-3">
            <ConfirmAction action={deleteCategoryAction.bind(null, cat.id)} label="Eliminar" confirm={`Eliminar "${cat.name}" definitivamente`} />
            <PublicLink href={`/categoria/${cat.slug}`}>Ver en la tienda</PublicLink>
          </div>
        </div>
      </details>
    </li>
  );
}

export default async function AdminCategories() {
  await requireAdmin();
  const all: Cat[] = await db.select({
    id: categories.id, name: categories.name, slug: categories.slug, parentId: categories.parentId, position: categories.position, active: categories.active,
    products: sql<number>`(select count(*)::int from ${products} where ${products.categoryId} = "categories"."id")`,
  }).from(categories).orderBy(asc(categories.position), asc(categories.name));
  const parents = all.filter((c) => c.parentId == null);

  return (
    <>
      <PageHeader title="Categorías" description="Árbol de dos niveles: categorías principales y subcategorías." />
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">Nueva categoría</h2>
        <CategoryForm parents={parents} />
      </section>
      <Section title="Árbol" description="Solo se pueden eliminar categorías sin productos ni subcategorías.">
        {parents.length === 0 ? (
          <EmptyState icon={<FolderTree className="size-5" />} title="Sin categorías">Crea la primera categoría con el formulario de arriba.</EmptyState>
        ) : (
          <ul className="card overflow-hidden">
            {parents.map((p) => (
              <li key={p.id} className="border-t border-line first:border-t-0">
                <ul>
                  <Row cat={p} parents={parents} />
                  {all.filter((c) => c.parentId === p.id).map((c) => <Row key={c.id} cat={c} parents={parents} child />)}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
