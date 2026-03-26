"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';
import { ModuleNotesTasks } from '@/components/module-notes-tasks';
import { buildPricingVars, computeUnitPrice } from '@/lib/pricing';

type Product = {
  id: string;
  sku: string;
  name: string;
  category?: string | null;
  uom?: string | null;
  salePrice?: string | number;
  pricingFormula: string | null;
};

type Attribute = {
  id: string;
  code: string;
  name: string;
  inputType: string;
  required: boolean;
  options: string[] | null;
  defaultValue: string | null;
  sortOrder?: number;
};

type Machine = {
  id: string;
  name: string;
  costPerMinute: string | number;
};

type Substrate = {
  id: string;
  name: string;
  addOnPrice: string | number;
};

type InventoryItem = {
  id: string;
  itemNumber: string;
  name: string;
};

type ProductInventoryRequirement = {
  id: string;
  inventoryItemId: string;
  qtyPerUnit: number;
  inventoryItem: InventoryItem;
};

export default function ProductDetailAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [pricingFormula, setPricingFormula] = useState('basePrice');
  const [category, setCategory] = useState('');
  const [uom, setUom] = useState('EA');

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [inputType, setInputType] = useState('NUMBER');
  const [required, setRequired] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [selectOptions, setSelectOptions] = useState<Array<{ label: string; priceValue: string; costValue: string }>>([{ label: '', priceValue: '', costValue: '' }]);

  const [previewQty, setPreviewQty] = useState('1');
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});

  const [builderSubstrates, setBuilderSubstrates] = useState('Blockout Fabric|1.35, Standard Knit|1.00, Backlit Fabric|1.55');
  const [builderMachineRateFallback, setBuilderMachineRateFallback] = useState('0.00');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [substrates, setSubstrates] = useState<Substrate[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryRequirements, setInventoryRequirements] = useState<ProductInventoryRequirement[]>([]);
  const [requirementInventoryItemId, setRequirementInventoryItemId] = useState('');
  const [requirementQtyPerUnit, setRequirementQtyPerUnit] = useState('1');
  const [builderSegRate, setBuilderSegRate] = useState('3.50');
  const [builderGrommetRate, setBuilderGrommetRate] = useState('0.90');
  const [builderHemRate, setBuilderHemRate] = useState('1.25');
  const [builderVelcroRate, setBuilderVelcroRate] = useState('2.10');
  const [builderMessage, setBuilderMessage] = useState('');
  const [builderSaving, setBuilderSaving] = useState(false);

  async function load(productId: string) {
    const [productsRes, attrsRes, machinesRes, substratesRes, inventoryItemsRes, requirementsRes] = await Promise.all([
      fetch('/api/admin/products'),
      fetch(`/api/admin/products/${productId}/attributes`),
      fetch('/api/admin/machines'),
      fetch('/api/admin/substrates'),
      fetch('/api/admin/inventory-items'),
      fetch(`/api/admin/products/${productId}/inventory-requirements`),
    ]);
    const products = await productsRes.json();
    const p = products.find((x: Product) => x.id === productId) || null;
    const attrs = await attrsRes.json();
    const machineRows = await machinesRes.json();
    const substrateRows = await substratesRes.json();
    const inventoryRows = await inventoryItemsRes.json();
    const requirementRows = await requirementsRes.json();

    setProduct(p);
    setPricingFormula(p?.pricingFormula || 'basePrice');
    setCategory(p?.category || '');
    setUom(p?.uom || 'EA');
    setAttributes(attrs);
    setMachines(Array.isArray(machineRows) ? machineRows : []);
    setSubstrates(Array.isArray(substrateRows) ? substrateRows : []);
    setInventoryItems(Array.isArray(inventoryRows) ? inventoryRows : []);
    setInventoryRequirements(Array.isArray(requirementRows) ? requirementRows : []);
    setPreviewValues(Object.fromEntries(attrs.map((a: Attribute) => [a.code, a.defaultValue || ''])));
  }

  async function saveFormula(e: FormEvent) {
    e.preventDefault();
    await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pricingFormula, category, uom }),
    });
    await load(id);
  }

  async function addAttribute(e: FormEvent) {
    e.preventDefault();
    await fetch(`/api/admin/products/${id}/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        name,
        inputType,
        required,
        defaultValue: defaultValue || null,
        options: inputType === 'SELECT'
          ? selectOptions
              .map((opt) => ({ label: opt.label.trim(), price: opt.priceValue.trim(), cost: opt.costValue.trim() }))
              .filter((opt) => opt.label && opt.price)
              .map((opt) => (opt.cost ? `${opt.label}|${opt.price}|${opt.cost}` : `${opt.label}|${opt.price}`))
          : null,
      }),
    });

    setCode('');
    setName('');
    setInputType('NUMBER');
    setRequired(false);
    setDefaultValue('');
    setSelectOptions([{ label: '', priceValue: '', costValue: '' }]);
    await load(id);
  }

  function updateSelectOption(index: number, patch: { label?: string; priceValue?: string; costValue?: string }) {
    setSelectOptions((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addSelectOptionRow() {
    setSelectOptions((prev) => [...prev, { label: '', priceValue: '', costValue: '' }]);
  }

  function removeSelectOptionRow(index: number) {
    setSelectOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function applyFabricRollPrintBuilder() {
    if (!id || builderSaving) return;
    setBuilderSaving(true);
    setBuilderMessage('');

    const substrateOptions = builderSubstrates
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (substrateOptions.length === 0) {
      setBuilderMessage('Please provide at least one substrate option.');
      setBuilderSaving(false);
      return;
    }

    const segRate = Number(builderSegRate || 0);
    const grommetRate = Number(builderGrommetRate || 0);
    const hemRate = Number(builderHemRate || 0);
    const velcroRate = Number(builderVelcroRate || 0);

    const safe = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '0.00');

    const targetAttrs: Array<{
      code: string;
      name: string;
      inputType: 'NUMBER' | 'SELECT' | 'BOOLEAN';
      required: boolean;
      defaultValue: string | null;
      options: string[] | null;
    }> = [
      { code: 'width', name: 'Width', inputType: 'NUMBER', required: true, defaultValue: '1', options: null },
      { code: 'height', name: 'Height', inputType: 'NUMBER', required: true, defaultValue: '1', options: null },
      { code: 'substrate', name: 'Substrate', inputType: 'SELECT', required: true, defaultValue: substrateOptions[0] || null, options: substrateOptions },
      { code: 'seg', name: 'SEG', inputType: 'BOOLEAN', required: false, defaultValue: 'false', options: null },
      { code: 'grommets', name: 'Grommets', inputType: 'BOOLEAN', required: false, defaultValue: 'false', options: null },
      { code: 'hemmed', name: 'Hemmed', inputType: 'BOOLEAN', required: false, defaultValue: 'false', options: null },
      { code: 'velcro', name: 'Velcro', inputType: 'BOOLEAN', required: false, defaultValue: 'false', options: null },
    ];

    const existingByCode = new Map(attributes.map((a) => [a.code.toLowerCase(), a]));
    const createdCodes: string[] = [];
    const skippedCodes: string[] = [];

    for (let index = 0; index < targetAttrs.length; index += 1) {
      const attr = targetAttrs[index];
      if (existingByCode.has(attr.code.toLowerCase())) {
        skippedCodes.push(attr.code);
        continue;
      }

      const res = await fetch(`/api/admin/products/${id}/attributes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: attr.code,
          name: attr.name,
          inputType: attr.inputType,
          required: attr.required,
          defaultValue: attr.defaultValue,
          sortOrder: attributes.length + index,
          options: attr.options,
        }),
      });

      if (res.ok) createdCodes.push(attr.code);
    }

    const formula = `
(basePrice * width * height * substrate)
+ (seg * ${safe(segRate)} * (2 * (width + height)))
+ (grommets * ${safe(grommetRate)} * (2 * (width + height)))
+ (hemmed * ${safe(hemRate)} * (2 * (width + height)))
+ (velcro * ${safe(velcroRate)} * (2 * (width + height)))
`.trim();

    await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pricingFormula: formula, category, uom }),
    });

    setPricingFormula(formula);
    await load(id);

    setBuilderSaving(false);
    setBuilderMessage(
      `Builder applied. Created: ${createdCodes.length ? createdCodes.join(', ') : 'none'}. Existing kept: ${skippedCodes.length ? skippedCodes.join(', ') : 'none'}.`
    );
  }

  async function applyFabricPrintMachineSubstrateBuilder() {
    if (!id || builderSaving) return;
    setBuilderSaving(true);
    setBuilderMessage('');

    const substrateOptionsFromAdmin = (substrates || [])
      .map((s) => `${s.name}|${Number(s.addOnPrice || 0).toFixed(2)}`)
      .filter(Boolean);

    const substrateOptions = substrateOptionsFromAdmin.length > 0
      ? substrateOptionsFromAdmin
      : builderSubstrates
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

    if (substrateOptions.length === 0) {
      setBuilderMessage('Please add at least one substrate in Admin → Substrates (or provide fallback options).');
      setBuilderSaving(false);
      return;
    }

    const machineOptions = (machines || [])
      .map((m) => {
        const n = Number(m.costPerMinute);
        const safe = Number.isFinite(n) ? n.toFixed(2) : builderMachineRateFallback;
        return `${m.name}|${safe}`;
      })
      .filter(Boolean);

    if (machineOptions.length === 0) {
      machineOptions.push(`Default Machine|${Number(builderMachineRateFallback || 0).toFixed(2)}`);
    }

    const targetAttrs: Array<{
      code: string;
      name: string;
      inputType: 'NUMBER' | 'SELECT';
      required: boolean;
      defaultValue: string | null;
      options: string[] | null;
    }> = [
      { code: 'width', name: 'Width', inputType: 'NUMBER', required: true, defaultValue: '1', options: null },
      { code: 'height', name: 'Height', inputType: 'NUMBER', required: true, defaultValue: '1', options: null },
      { code: 'machine', name: 'Machine', inputType: 'SELECT', required: true, defaultValue: machineOptions[0] || null, options: machineOptions },
      { code: 'substrate', name: 'Substrate', inputType: 'SELECT', required: true, defaultValue: substrateOptions[0] || null, options: substrateOptions },
    ];

    const existingByCode = new Map(attributes.map((a) => [a.code.toLowerCase(), a]));
    const createdCodes: string[] = [];
    const skippedCodes: string[] = [];

    for (let index = 0; index < targetAttrs.length; index += 1) {
      const attr = targetAttrs[index];
      if (existingByCode.has(attr.code.toLowerCase())) {
        skippedCodes.push(attr.code);
        continue;
      }

      const res = await fetch(`/api/admin/products/${id}/attributes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: attr.code,
          name: attr.name,
          inputType: attr.inputType,
          required: attr.required,
          defaultValue: attr.defaultValue,
          sortOrder: attributes.length + index,
          options: attr.options,
        }),
      });

      if (res.ok) createdCodes.push(attr.code);
    }

    const formula = '((basePrice + substrate) * width * height) + machine';

    await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pricingFormula: formula, category, uom }),
    });

    setPricingFormula(formula);
    await load(id);

    setBuilderSaving(false);
    setBuilderMessage(
      `Fabric print pricing builder applied. Created: ${createdCodes.length ? createdCodes.join(', ') : 'none'}. Existing kept: ${skippedCodes.length ? skippedCodes.join(', ') : 'none'}.`
    );
  }

  async function addInventoryRequirement(e: FormEvent) {
    e.preventDefault();
    if (!id || !requirementInventoryItemId) return;
    await fetch(`/api/admin/products/${id}/inventory-requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventoryItemId: requirementInventoryItemId, qtyPerUnit: Number(requirementQtyPerUnit || 1) }),
    });
    setRequirementQtyPerUnit('1');
    setRequirementInventoryItemId('');
    await load(id);
  }

  async function removeInventoryRequirement(requirementId: string) {
    if (!id) return;
    await fetch(`/api/admin/products/${id}/inventory-requirements/${requirementId}`, { method: 'DELETE' });
    await load(id);
  }

  const previewPrice = useMemo(() => {
    const basePrice = Number(product?.salePrice || 0);
    const qty = Number(previewQty || 1);
    const vars = buildPricingVars(qty, basePrice, previewValues);
    return computeUnitPrice(basePrice, pricingFormula, vars);
  }, [previewQty, previewValues, pricingFormula, product?.salePrice]);

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      load(p.id);
    });
  }, [params]);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Product Pricing Rules</h1>
      <p className="text-sm text-zinc-400">{product ? `${product.sku} — ${product.name}` : 'Loading...'}</p>
      <Nav />

      <section className="mb-4 rounded border border-zinc-800 p-4">
        <h2 className="mb-2 font-medium">Config Builder: Fabric Roll Print</h2>
        <p className="mb-3 text-xs text-zinc-400">Creates/ensures width, height, substrate, SEG, grommets, hemmed, and velcro attributes, then sets a perimeter-based pricing formula.</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <label className="text-xs text-zinc-300">
            Substrates (comma separated, use Label|Multiplier)
            <input value={builderSubstrates} onChange={(e) => setBuilderSubstrates(e.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-zinc-300">
              SEG $/linear unit
              <input value={builderSegRate} onChange={(e) => setBuilderSegRate(e.target.value)} type="number" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            </label>
            <label className="text-xs text-zinc-300">
              Grommets $/linear unit
              <input value={builderGrommetRate} onChange={(e) => setBuilderGrommetRate(e.target.value)} type="number" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            </label>
            <label className="text-xs text-zinc-300">
              Hemmed $/linear unit
              <input value={builderHemRate} onChange={(e) => setBuilderHemRate(e.target.value)} type="number" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            </label>
            <label className="text-xs text-zinc-300">
              Velcro $/linear unit
              <input value={builderVelcroRate} onChange={(e) => setBuilderVelcroRate(e.target.value)} type="number" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            </label>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={applyFabricRollPrintBuilder} disabled={builderSaving} className="rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-60">
            {builderSaving ? 'Applying…' : 'Apply Fabric Roll Print Builder'}
          </button>
          <button onClick={applyFabricPrintMachineSubstrateBuilder} disabled={builderSaving} className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60">
            {builderSaving ? 'Applying…' : 'Apply Base + Machine + Substrate + Dimensions'}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <label className="text-xs text-zinc-300">
            Machine fallback add-on (used when no active machines are configured)
            <input value={builderMachineRateFallback} onChange={(e) => setBuilderMachineRateFallback(e.target.value)} type="number" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          <div className="rounded border border-zinc-700 bg-zinc-900/30 p-2 text-xs text-zinc-400">
            <p className="font-medium text-zinc-300">Pricing sources</p>
            <p>Machine options: active Admin → Machines entries as <code>Name|costPerMinute</code>.</p>
            <p>Substrate options: active Admin → Substrates entries as <code>Name|pricePerSqUnit</code> (fallback to typed list if none exist).</p>
            <p>Formula set by this builder: <code>((basePrice + substrate) * width * height) + machine</code></p>
          </div>
        </div>
        {builderMessage ? <p className="mt-2 text-xs text-zinc-300">{builderMessage}</p> : null}
      </section>

      <form onSubmit={saveFormula} className="mb-4 rounded border border-zinc-800 p-4 space-y-2">
        <p className="text-sm text-zinc-300">Pricing Formula</p>
        <input value={pricingFormula} onChange={(e) => setPricingFormula(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          <input value={uom} onChange={(e) => setUom(e.target.value)} placeholder="UOM (EA, sqft, ft)" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        </div>
        <p className="text-xs text-zinc-400">Examples: <code>basePrice + width * height * 0.12</code> or <code>width &lt;= 24 ? 12 : width &lt;= 48 ? 20 : 30</code>. Boolean values resolve to <code>1/0</code>. SELECT values can use <code>Label|Number</code> (example: <code>Premium|12.5</code>).</p>
        <button className="rounded bg-blue-600 px-3 py-2 text-sm">Save Rules</button>
      </form>

      <div className="mb-4 rounded border border-zinc-800 p-4">
        <h2 className="mb-2 font-medium">Formula Preview</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <label className="text-xs text-zinc-300">
            Qty
            <input value={previewQty} onChange={(e) => setPreviewQty(e.target.value)} type="number" min="1" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          {attributes.map((attr) => (
            <label key={attr.id} className="text-xs text-zinc-300">
              {attr.name}
              {attr.inputType === 'SELECT' ? (
                <select value={previewValues[attr.code] || ''} onChange={(e) => setPreviewValues((p) => ({ ...p, [attr.code]: e.target.value }))} className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900">
                  <option value="">Select</option>
                  {(attr.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : attr.inputType === 'BOOLEAN' ? (
                <span className="mt-1 flex h-[42px] items-center rounded border border-zinc-700 bg-white px-2 text-zinc-900">
                  <input
                    type="checkbox"
                    checked={(previewValues[attr.code] || '').toLowerCase() === 'true'}
                    onChange={(e) => setPreviewValues((p) => ({ ...p, [attr.code]: e.target.checked ? 'true' : 'false' }))}
                  />
                </span>
              ) : (
                <input value={previewValues[attr.code] || ''} onChange={(e) => setPreviewValues((p) => ({ ...p, [attr.code]: e.target.value }))} type={attr.inputType === 'NUMBER' ? 'number' : 'text'} className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
              )}
            </label>
          ))}
        </div>
        <p className="mt-3 text-sm text-zinc-200">Calculated Unit Price: <span className="font-semibold">${previewPrice.toFixed(2)}</span></p>
      </div>

      <form onSubmit={addAttribute} className="mb-4 grid grid-cols-1 gap-2 rounded border border-zinc-800 p-4 md:grid-cols-6">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="code (e.g. width)" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Label" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        <select value={inputType} onChange={(e) => setInputType(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
          <option value="NUMBER">NUMBER</option><option value="TEXT">TEXT</option><option value="SELECT">SELECT</option><option value="BOOLEAN">BOOLEAN</option>
        </select>
        <input value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} placeholder="default value" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <label className="flex items-center gap-2 rounded border border-zinc-700 p-2 text-sm"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /> Required</label>

        {inputType === 'SELECT' ? (
          <div className="md:col-span-6 rounded border border-zinc-700 p-3">
            <p className="mb-2 text-xs text-zinc-300">Select options with explicit price differentiator</p>
            <div className="space-y-2">
              {selectOptions.map((row, index) => (
                <div key={`opt-${index}`} className="grid grid-cols-1 gap-2 md:grid-cols-12">
                  <input
                    value={row.label}
                    onChange={(e) => updateSelectOption(index, { label: e.target.value })}
                    placeholder="Option label (e.g. Backlit Fabric)"
                    className="rounded border border-zinc-700 bg-white p-2 text-zinc-900 md:col-span-4"
                  />
                  <input
                    value={row.priceValue}
                    onChange={(e) => updateSelectOption(index, { priceValue: e.target.value })}
                    placeholder="Price value (e.g. 1.55)"
                    type="number"
                    step="0.01"
                    className="rounded border border-zinc-700 bg-white p-2 text-zinc-900 md:col-span-3"
                  />
                  <input
                    value={row.costValue}
                    onChange={(e) => updateSelectOption(index, { costValue: e.target.value })}
                    placeholder="Cost value (optional, e.g. 0.72)"
                    type="number"
                    step="0.01"
                    className="rounded border border-zinc-700 bg-white p-2 text-zinc-900 md:col-span-3"
                  />
                  <button
                    type="button"
                    onClick={() => removeSelectOptionRow(index)}
                    disabled={selectOptions.length === 1}
                    className="rounded border border-zinc-700 px-2 py-1 text-xs md:col-span-2 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addSelectOptionRow} className="mt-2 rounded border border-zinc-700 px-2 py-1 text-xs">
              + Add Option
            </button>
            <p className="mt-2 text-[11px] text-zinc-500">Stored format is Label|Price|Cost (cost optional). Formulas still use the price value.</p>
          </div>
        ) : null}

        <button className="rounded bg-blue-600 px-3 py-2 md:col-span-6">Add Attribute</button>
      </form>

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300"><tr><th className="p-3">Code</th><th className="p-3">Label</th><th className="p-3">Type</th><th className="p-3">Default</th><th className="p-3">Options</th><th className="p-3">Required</th></tr></thead>
          <tbody>{attributes.map((a) => (<tr key={a.id} className="border-t border-zinc-800"><td className="p-3">{a.code}</td><td className="p-3">{a.name}</td><td className="p-3">{a.inputType}</td><td className="p-3">{a.defaultValue || '—'}</td><td className="p-3">{a.options?.join(', ') || '—'}</td><td className="p-3">{a.required ? 'Yes' : 'No'}</td></tr>))}</tbody>
        </table>
      </div>

      <section className="mt-4 rounded border border-zinc-800 p-3">
        <h2 className="text-sm font-semibold text-zinc-200">Inventory Requirements</h2>
        <p className="text-xs text-zinc-400">Tie this product to inventory items with quantity required per product unit.</p>

        <form onSubmit={addInventoryRequirement} className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
          <label className="text-xs text-zinc-300 md:col-span-2">Inventory Item
            <select value={requirementInventoryItemId} onChange={(e) => setRequirementInventoryItemId(e.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" required>
              <option value="">Select item</option>
              {inventoryItems.map((item) => <option key={item.id} value={item.id}>{item.itemNumber} — {item.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-zinc-300">Qty per Product Unit
            <input value={requirementQtyPerUnit} onChange={(e) => setRequirementQtyPerUnit(e.target.value)} type="number" min="1" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
          </label>
          <div className="flex items-end">
            <button className="rounded bg-emerald-600 px-3 py-2 text-sm text-white">Add Requirement</button>
          </div>
        </form>

        <div className="mt-3 overflow-hidden rounded border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-300"><tr><th className="p-3">Inventory Item</th><th className="p-3">Qty / Unit</th><th className="p-3 text-right">Actions</th></tr></thead>
            <tbody>
              {inventoryRequirements.map((r) => (
                <tr key={r.id} className="border-t border-zinc-800">
                  <td className="p-3">{r.inventoryItem.itemNumber} — {r.inventoryItem.name}</td>
                  <td className="p-3">{r.qtyPerUnit}</td>
                  <td className="p-3 text-right"><button type="button" onClick={() => removeInventoryRequirement(r.id)} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700">Remove</button></td>
                </tr>
              ))}
              {inventoryRequirements.length === 0 ? <tr><td className="p-3 text-zinc-500" colSpan={3}>No inventory requirements yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <ModuleNotesTasks entityType="PRODUCT" entityId={id} />
    </main>
  );
}
