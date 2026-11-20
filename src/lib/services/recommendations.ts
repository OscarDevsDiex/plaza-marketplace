import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { rowsOf } from '@/lib/db/client';

/**
 * Recomendaciones simples y explicables: productos populares de las categorías que la persona compró o guardó,
 * excluyendo lo que ya compró. Suficiente para empezar; se puede reemplazar por un modelo después.
 */
export async function recommendedFor(userId: string) {
  const res = await db.execute(sql`
    with interest as (
      select p.category_id from favorites f join products p on p.id = f.product_id where f.user_id = ${userId}
      union all
      select p.category_id from orders o join seller_orders so on so.order_id = o.id join order_items oi on oi.seller_order_id = so.id
        join products p on p.id = oi.product_id where o.buyer_id = ${userId}
    ), bought as (
      select oi.product_id from orders o join seller_orders so on so.order_id = o.id join order_items oi on oi.seller_order_id = so.id where o.buyer_id = ${userId}
    )
    select p.id from products p join stores s on s.id = p.store_id
    where p.status = 'active' and s.status = 'active' and s.owner_id <> ${userId}
      and p.category_id in (select category_id from interest)
      and p.id not in (select product_id from bought where product_id is not null)
    order by p.sales_count desc, p.rating_avg desc limit 10`);
  return rowsOf<{ id: string }>(res).map((r) => r.id);
}
