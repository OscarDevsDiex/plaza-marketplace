'use client';

import { useState } from 'react';
import { Field, Input, Select, Checkbox } from '@/components/ui/form';

export const MX_STATES = ['Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'];

type Address = { id: string; recipientName: string; phone: string; street: string; extNumber: string; intNumber: string | null; neighborhood: string; city: string; state: string; postalCode: string; references: string | null };
const EMPTY = { recipientName: '', phone: '', street: '', extNumber: '', intNumber: '', neighborhood: '', city: '', state: '', postalCode: '', references: '' };

/** Campos de dirección. Si la persona tiene direcciones guardadas, elegir una llena el formulario. */
export function AddressFields({ saved, defaultName }: { saved: Address[]; defaultName: string }) {
  const initial = saved[0];
  const [pick, setPick] = useState(initial?.id ?? 'new');
  const [v, setV] = useState(() => (initial ? { ...EMPTY, ...strip(initial) } : { ...EMPTY, recipientName: defaultName }));
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      {saved.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {saved.map((a) => (
            <label key={a.id} className={`cursor-pointer rounded-xl border p-3.5 text-sm transition-colors ${pick === a.id ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-line-strong'}`}>
              <input type="radio" name="addressPick" className="sr-only" checked={pick === a.id} onChange={() => { setPick(a.id); setV({ ...EMPTY, ...strip(a) }); }} />
              <div className="font-medium">{a.recipientName}</div>
              <div className="mt-0.5 text-xs text-muted">{a.street} {a.extNumber}, {a.neighborhood}, {a.city}, {a.state} {a.postalCode}</div>
            </label>
          ))}
          <label className={`grid cursor-pointer place-items-center rounded-xl border border-dashed p-3.5 text-sm font-medium ${pick === 'new' ? 'border-ink text-ink' : 'border-line-strong text-muted hover:text-ink'}`}>
            <input type="radio" name="addressPick" className="sr-only" checked={pick === 'new'} onChange={() => { setPick('new'); setV({ ...EMPTY, recipientName: defaultName }); }} />
            + Nueva dirección
          </label>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre de quien recibe" htmlFor="recipientName"><Input id="recipientName" name="recipientName" value={v.recipientName} onChange={set('recipientName')} required autoComplete="shipping name" /></Field>
        <Field label="Teléfono" htmlFor="phone"><Input id="phone" name="phone" value={v.phone} onChange={set('phone')} required inputMode="tel" autoComplete="shipping tel" placeholder="10 dígitos" /></Field>
        <Field label="Calle" htmlFor="street" className="sm:col-span-2"><Input id="street" name="street" value={v.street} onChange={set('street')} required autoComplete="shipping address-line1" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Núm. exterior" htmlFor="extNumber"><Input id="extNumber" name="extNumber" value={v.extNumber} onChange={set('extNumber')} required /></Field>
          <Field label="Núm. interior" htmlFor="intNumber"><Input id="intNumber" name="intNumber" value={v.intNumber} onChange={set('intNumber')} placeholder="Opcional" /></Field>
        </div>
        <Field label="Colonia" htmlFor="neighborhood"><Input id="neighborhood" name="neighborhood" value={v.neighborhood} onChange={set('neighborhood')} required /></Field>
        <Field label="Código postal" htmlFor="postalCode"><Input id="postalCode" name="postalCode" value={v.postalCode} onChange={set('postalCode')} required inputMode="numeric" pattern="\d{5}" maxLength={5} autoComplete="shipping postal-code" /></Field>
        <Field label="Ciudad o municipio" htmlFor="city"><Input id="city" name="city" value={v.city} onChange={set('city')} required autoComplete="shipping address-level2" /></Field>
        <Field label="Estado" htmlFor="state" className="sm:col-span-2">
          <Select id="state" name="state" value={v.state} onChange={set('state')} required>
            <option value="" disabled>Elige tu estado</option>
            {MX_STATES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Referencias (opcional)" htmlFor="references" className="sm:col-span-2" hint="Entre qué calles, color de la fachada…"><Input id="references" name="references" value={v.references} onChange={set('references')} maxLength={300} /></Field>
      </div>
      {pick === 'new' && <Checkbox name="saveAddress" defaultChecked label="Guardar esta dirección para próximas compras" />}
    </div>
  );
}

function strip(a: Address) {
  return { recipientName: a.recipientName, phone: a.phone, street: a.street, extNumber: a.extNumber, intNumber: a.intNumber ?? '', neighborhood: a.neighborhood, city: a.city, state: a.state, postalCode: a.postalCode, references: a.references ?? '' };
}
