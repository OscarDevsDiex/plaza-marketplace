'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { AppError, runAction, str, type ActionState } from '@/lib/errors';
import { assertUser } from '@/lib/auth/guards';
import { db, schema } from '@/lib/db';
import { markAllRead } from '@/lib/services/community';

const addressSchema = z.object({
  recipientName: z.string().trim().min(3, 'Nombre de quien recibe').max(100),
  phone: z.string().trim().regex(/^\+?[\d\s-]{10,16}$/, 'Teléfono inválido'),
  street: z.string().trim().min(2, 'Calle').max(120),
  extNumber: z.string().trim().min(1, 'Número exterior').max(20),
  intNumber: z.string().trim().max(20),
  neighborhood: z.string().trim().min(2, 'Colonia').max(100),
  city: z.string().trim().min(2, 'Ciudad').max(80),
  state: z.string().trim().min(2, 'Estado').max(60),
  postalCode: z.string().trim().regex(/^\d{5}$/, 'Código postal de 5 dígitos'),
  references: z.string().trim().max(300),
});

export async function addAddressAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertUser();
    const parsed = addressSchema.safeParse(Object.fromEntries(Object.keys(addressSchema.shape).map((k) => [k, str(fd, k)])));
    if (!parsed.success) throw new AppError(`Revisa: ${parsed.error.issues[0].message}`);
    const count = await db.$count(schema.addresses, eq(schema.addresses.userId, user.id));
    if (count >= 10) throw new AppError('Puedes guardar hasta 10 direcciones');
    await db.insert(schema.addresses).values({ ...parsed.data, intNumber: parsed.data.intNumber || null, references: parsed.data.references || null, userId: user.id, isDefault: count === 0 });
    revalidatePath('/cuenta/direcciones');
    return 'Dirección guardada';
  });
}

export async function deleteAddressAction(id: string) {
  const user = await assertUser();
  await db.delete(schema.addresses).where(and(eq(schema.addresses.id, id), eq(schema.addresses.userId, user.id)));
  revalidatePath('/cuenta/direcciones');
}

export async function defaultAddressAction(id: string) {
  const user = await assertUser();
  await db.transaction(async (tx) => {
    const [own] = await tx.select({ id: schema.addresses.id }).from(schema.addresses).where(and(eq(schema.addresses.id, id), eq(schema.addresses.userId, user.id)));
    if (!own) return;
    await tx.update(schema.addresses).set({ isDefault: false }).where(eq(schema.addresses.userId, user.id));
    await tx.update(schema.addresses).set({ isDefault: true }).where(eq(schema.addresses.id, id));
  });
  revalidatePath('/cuenta/direcciones');
}

export async function markNotificationsReadAction() {
  const user = await assertUser();
  await markAllRead(user.id);
  revalidatePath('/', 'layout');
}

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertUser();
    const name = str(fd, 'name', 80);
    if (name.length < 2) throw new AppError('Escribe tu nombre');
    await db.update(schema.users).set({ name }).where(eq(schema.users.id, user.id));
    revalidatePath('/', 'layout');
    return 'Nombre actualizado';
  });
}
