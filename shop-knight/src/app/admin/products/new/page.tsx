"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';

type Department = { id: string; name: string; active: boolean };
type ProductCategory = { id: string; name: string; active: boolean };
type IncomeAccount = { id: string; code: string; name: string; active: boolean };

type DraftAttribute = {
  code: string;
  name: string;
  inputType: 'NUMBER' | 'TEXT' | 'SELECT' | 'BOOLEAN';
  required: boolean;
  defaultValue: string;
  optionsCsv: string;
};

export default function NewProductPage() {
  const router = useRouter();
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('PRINT');
  const [departmentId, setDepartmentId] = useState('');
  const [incomeAccountId, setIncomeAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [category, setCategory] = useState('');
  const [uom, setUom] = useState('EA');
  const [description, setDescription] = useState('');
  const [salePrice, setSalePrice] = useState('0.00');
  const [costPrice, setCostPrice] = useState('0.00');
  const [gpmPercent, setGpmPercent] = useState('35');
  const [taxable, setTaxable] = useState(true);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [incomeAccounts, setIncomeAccounts] = useState<IncomeAccount[]>([]);

  const [attributes, setAttributes] = useState<DraftAttribute[]>([]);
  const [attrCode, setAttrCode] = useState('');
  const [attrName, setAttrName] = useState('');
  const [showAttributeAdvanced, setShowAttributeAdvanced] = useState(false);
  const [attrInputType, setAttrInputType] = useState<DraftAttribute['inputType']>('NUMBER');
  const [attrRequired, setAttrRequired] = useState(false);
  const [attrDefaultValue, setAttrDefaultValue] = useState('');
  const [attrOptionsCsv, setAttrOptionsCsv] = useState('');
  const [showAttributeForm, setShowAttributeForm] = useState(false);
  const [attributeWizardStep, setAttributeWizardStep] = useState(1);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const suggestedAttrCode = useMemo(() => {
    const base = attrName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);
    return base || '';
  }, [attrName]);

  useEffect(() => {
    async function loadOptions() {
      const [dRes, cRes, iRes] = await Promise.all([
        fetch('/api/admin/departments'),
        fetch('/api/admin/product-categories'),
        fetch('/api/admin/income-accounts'),
      ]);
      if (dRes.ok) setDepartments((await dRes.json()).filter((d: Department) => d.active));
      if (cRes.ok) setCategories((await cRes.json()).filter((c: ProductCategory) => c.active));
      if (iRes.ok) setIncomeAccounts((await iRes.json()).filter((i: IncomeAccount) => i.active));
    }
    loadOptions();
  }, []);

  function addAttributeDraft(e: FormEvent) {
    e.preventDefault();

    const code = (attrCode.trim() || suggestedAttrCode).trim();
    const label = attrName.trim();

    if (!code || !label) {
      setError('Attribute code and label are required.');
      return;
    }

    if (attributes.some((item) => item.code.toLowerCase() === code.toLowerCase())) {
      setError('Attribute code must be unique.');
      return;
    }

    const parsedOptions = attrOptionsCsv
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (attrInputType === 'SELECT' && parsedOptions.length === 0) {
      setError('Dropdown attributes need at least one choice.');
      return;
    }

    setAttributes((prev) => [
      ...prev,
      {
        code,
        name: label,
        inputType: attrInputType,
        required: attrRequired,
        defaultValue: attrDefaultValue.trim(),
        optionsCsv: parsedOptions.join('\n'),
      },
    ]);

    setAttrCode('');
    setAttrName('');
    setAttrInputType('NUMBER');
    setAttrRequired(false);
    setAttrDefaultValue('');
    setAttrOptionsCsv('');
    setShowAttributeAdvanced(false);
    setAttributeWizardStep(1);
    setShowAttributeForm(false);
    setError('');
  }

  function removeAttributeDraft(code: string) {
    setAttributes((prev) => prev.filter((item) => item.code !== code));
  }

  async function createProduct(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError('');

    if (!departmentId || !incomeAccountId || !categoryId || !type) {
      setError('Type, Department, Income Account, and Category are required.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku,
          name,
          type,
          departmentId,
          incomeAccountId,
          categoryId,
          category,
          uom,
          description,
          salePrice,
          costPrice,
          gpmPercent,
          taxable,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data?.error === 'string' ? data.error : 'Failed to create product');
        return;
      }

      const created = await res.json();
      const productId = String(created?.id || '');

      if (productId && attributes.length > 0) {
        for (let index = 0; index < attributes.length; index += 1) {
          const attr = attributes[index];
          const attrRes = await fetch(`/api/admin/products/${productId}/attributes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: attr.code,
              name: attr.name,
              inputType: attr.inputType,
              required: attr.required,
              defaultValue: attr.defaultValue || null,
              sortOrder: index,
              options: attr.inputType === 'SELECT'
                ? attr.optionsCsv.split('\n').map((s) => s.trim()).filter(Boolean)
                : null,
            }),
          });

          if (!attrRes.ok) {
            const data = await attrRes.json().catch(() => ({}));
            setError(
              typeof data?.error === 'string'
                ? `Product created, but attribute "${attr.name}" failed: ${data.error}`
                : `Product created, but attribute "${attr.name}" failed to save.`
            );
            return;
          }
        }
      }

      router.push('/admin/products');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl bg-[#f5f7fa] p-8 text-slate-800">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Create Product</h1>
          <p className="text-sm text-slate-500">Key in product details and optional attributes in one flow.</p>
        </div>
        <Link
          href="/admin/products"
          className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to Products
        </Link>
      </div>

      <Nav />

      <form onSubmit={createProduct} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            SKU
            <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" className="field mt-1" required />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Product Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" className="field mt-1" required />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Type
            <input value={type} onChange={(e) => setType(e.target.value)} placeholder="PRINT, LABOR, INSTALL..." className="field mt-1" required />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Department (Revenue Recognition)
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="field mt-1" required>
              <option value="">Select department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Income Account
            <select value={incomeAccountId} onChange={(e) => setIncomeAccountId(e.target.value)} className="field mt-1" required>
              <option value="">Select income account</option>
              {incomeAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Category
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field mt-1" required>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Unit of Measure
            <input value={uom} onChange={(e) => setUom(e.target.value)} placeholder="EA, sqft, ft" className="field mt-1" />
          </label>

          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="field mt-1" />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Revenue Price
            <input value={salePrice} onChange={(e) => setSalePrice(e.target.value)} type="number" step="0.01" min="0" placeholder="0.00" className="field mt-1" required />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Cost
            <input value={costPrice} onChange={(e) => setCostPrice(e.target.value)} type="number" step="0.01" min="0" placeholder="0.00" className="field mt-1" />
          </label>

          <label className="text-sm font-medium text-slate-700">
            GPM %
            <input value={gpmPercent} onChange={(e) => setGpmPercent(e.target.value)} type="number" step="0.01" min="0" max="99.99" placeholder="35" className="field mt-1" />
          </label>

          <label className="mt-1 flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 md:col-span-2">
            <input checked={taxable} onChange={(e) => setTaxable(e.target.checked)} type="checkbox" />
            Taxable
          </label>
        </div>

        <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-800">Attributes</h2>
          <p className="mt-1 text-xs text-slate-500">Add optional product attributes now (width, height, material, finish, etc.). For SELECT options, you can use <span className="font-mono">Label|Number</span> (example: <span className="font-mono">Rush|25</span>) so formulas can use the numeric value.</p>

          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Code</th>
                  <th className="px-3 py-2 font-semibold">Label</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Default</th>
                  <th className="px-3 py-2 font-semibold">Options</th>
                  <th className="px-3 py-2 font-semibold">Required</th>
                  <th className="px-3 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attributes.map((a) => (
                  <tr key={a.code} className="border-t border-slate-100">
                    <td className="px-3 py-2">{a.code}</td>
                    <td className="px-3 py-2">{a.name}</td>
                    <td className="px-3 py-2">{a.inputType}</td>
                    <td className="px-3 py-2">{a.defaultValue || '—'}</td>
                    <td className="px-3 py-2">{a.inputType === 'SELECT' ? (a.optionsCsv || '—') : '—'}</td>
                    <td className="px-3 py-2">{a.required ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => removeAttributeDraft(a.code)} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {attributes.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-center text-slate-500" colSpan={7}>No attributes added yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {!showAttributeForm ? (
            <button
              type="button"
              onClick={() => {
                setShowAttributeForm(true);
                setAttributeWizardStep(1);
                setError('');
              }}
              className="mt-3 inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Add Attribute
            </button>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {attributeWizardStep} of 3</p>

                {attributeWizardStep === 1 ? (
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <label className="text-xs font-medium text-slate-700 md:col-span-2">
                      Attribute Name
                      <input value={attrName} onChange={(e) => setAttrName(e.target.value)} placeholder="e.g. Width" className="field mt-1" />
                    </label>
                    <label className="text-xs font-medium text-slate-700">
                      Field Type
                      <select value={attrInputType} onChange={(e) => setAttrInputType(e.target.value as DraftAttribute['inputType'])} className="field mt-1">
                        <option value="NUMBER">Number (for dimensions/pricing)</option>
                        <option value="TEXT">Text (free entry)</option>
                        <option value="SELECT">Dropdown (pick from list)</option>
                        <option value="BOOLEAN">Yes / No</option>
                      </select>
                    </label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
                      <p className="font-semibold text-slate-700">Quick tip</p>
                      <p>Use <b>Number</b> for width/height/quantities, <b>Dropdown</b> for pick-lists, and <b>Yes/No</b> for toggles.</p>
                    </div>
                  </div>
                ) : null}

                {attributeWizardStep === 2 ? (
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <label className="text-xs font-medium text-slate-700">
                      Starting Value (optional)
                      <input value={attrDefaultValue} onChange={(e) => setAttrDefaultValue(e.target.value)} placeholder="optional" className="field mt-1" />
                    </label>
                    <label className="text-xs font-medium text-slate-700">
                      Required
                      <span className="mt-1 flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700">
                        <input checked={attrRequired} onChange={(e) => setAttrRequired(e.target.checked)} type="checkbox" />
                        Must be selected
                      </span>
                    </label>
                    {attrInputType === 'SELECT' ? (
                      <label className="text-xs font-medium text-slate-700 md:col-span-2">
                        Dropdown Choices (one per line)
                        <textarea value={attrOptionsCsv} onChange={(e) => setAttrOptionsCsv(e.target.value)} placeholder={"Standard\nPremium\nRush|25"} rows={5} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring" />
                        <span className="mt-1 block text-[11px] text-slate-500">Tip: Use <span className="font-mono">Label|Number</span> if this choice should change pricing.</span>
                      </label>
                    ) : null}
                  </div>
                ) : null}

                {attributeWizardStep === 3 ? (
                  <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <p><span className="font-semibold">Name:</span> {attrName || '—'}</p>
                    <p><span className="font-semibold">Type:</span> {attrInputType}</p>
                    <p><span className="font-semibold">Starting Value:</span> {attrDefaultValue || '—'}</p>
                    <p><span className="font-semibold">Required:</span> {attrRequired ? 'Yes' : 'No'}</p>
                    {attrInputType === 'SELECT' ? <p><span className="font-semibold">Choices:</span> {(attrOptionsCsv || '—').split('\n').filter(Boolean).join(', ') || '—'}</p> : null}
                  </div>
                ) : null}

                <div className="mt-3 flex items-center gap-2">
                  <button type="button" onClick={() => setAttributeWizardStep((s) => Math.max(1, s - 1))} disabled={attributeWizardStep === 1} className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Back</button>
                  <button type="button" onClick={() => setAttributeWizardStep((s) => Math.min(3, s + 1))} disabled={attributeWizardStep === 3} className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Next</button>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowAttributeAdvanced((prev) => !prev)}
                  className="text-xs font-medium text-slate-600 underline underline-offset-2"
                >
                  {showAttributeAdvanced ? 'Hide advanced settings' : 'Show advanced settings'}
                </button>
                {showAttributeAdvanced ? (
                  <div className="mt-2 max-w-md rounded-lg border border-slate-200 bg-white p-2">
                    <label className="text-xs font-medium text-slate-700">
                      Attribute Code (advanced)
                      <input value={attrCode} onChange={(e) => setAttrCode(e.target.value)} placeholder={suggestedAttrCode || 'auto-generated from name'} className="field mt-1" />
                    </label>
                    <p className="mt-1 text-[11px] text-slate-500">If left blank, code auto-generates from the attribute name.</p>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addAttributeDraft}
                  disabled={attributeWizardStep !== 3}
                  className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Save Attribute
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAttributeForm(false);
                    setAttrCode('');
                    setAttrName('');
                    setAttrInputType('NUMBER');
                    setAttrRequired(false);
                    setAttrDefaultValue('');
                    setAttrOptionsCsv('');
                    setShowAttributeAdvanced(false);
                    setAttributeWizardStep(1);
                    setError('');
                  }}
                  className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-4 flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create Product'}
          </button>
          <Link href="/admin/products" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
