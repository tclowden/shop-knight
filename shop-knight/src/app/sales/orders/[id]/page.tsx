"use client";

import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { ModuleNotesTasks } from '@/components/module-notes-tasks';
import { StatusChip } from '@/components/status-chip';
import { useUnsavedGuard } from '@/components/use-unsaved-guard';
import { useToast } from '@/components/toast-provider';

type Product = { id: string; sku: string; name: string; salePrice: string | number };
type User = { id: string; name: string; type: string };
type SalesOrderStatus = { id: string; name: string };
type WorkflowTemplateOption = { id: string; name: string };
type OpportunityOption = { id: string; name: string; customer: string };
type TravelerOption = { id: string; fullName: string };
type Proof = {
  id: string;
  version: number;
  fileName: string;
  mimeType: string;
  status: 'PENDING' | 'APPROVED' | 'REVISIONS_REQUESTED';
  approvalNotes?: string | null;
  createdAt: string;
  lastRequest?: {
    id: string;
    recipientEmail: string;
    expiresAt: string;
    respondedAt: string | null;
    decision: string | null;
  } | null;
};
type Line = { id: string; description: string; qty: number; unitPrice: string | number; productId?: string | null; sortOrder?: number; parentLineId?: string | null; collapsed?: boolean };
type LoadListItem = { id: string; item: string; qty: number; salesOrderLineId?: string | null };
type LoadList = { id: string; name: string; createdAt: string; items: LoadListItem[] };
type LinkedTrip = {
  id: string;
  name: string;
  destinations?: string | null;
  destinationCity?: string | null;
  destinationState?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  billable: boolean;
  salesOrderRef?: string | null;
};
type SalesOrder = {
  opportunityId?: string;
  id: string;
  orderNumber: string;
  title?: string | null;
  status?: { name: string } | null;
  primaryCustomerContact?: string | null;
  customerInvoiceContact?: string | null;
  billingAddress?: string | null;
  billingAttentionTo?: string | null;
  shippingAddress?: string | null;
  shippingAttentionTo?: string | null;
  installAddress?: string | null;
  shippingMethod?: string | null;
  shippingTracking?: string | null;
  salesOrderDate?: string | null;
  dueDate?: string | null;
  installDate?: string | null;
  shippingDate?: string | null;
  earlyBirdDiscountDate?: string | null;
  advancedReceivingDeadline?: string | null;
  shipFromRoarkDate?: string | null;
  travelToSiteStart?: string | null;
  travelToSiteEnd?: string | null;
  outboundShippingFromShowDate?: string | null;
  estimatedInvoiceDate?: string | null;
  paymentTerms?: string | null;
  downPaymentType?: string | null;
  downPaymentValue?: string | number | null;
  salesRepId?: string | null;
  projectManagerId?: string | null;
  designerId?: string | null;
  salesRep?: { name: string } | null;
  projectManager?: { name: string } | null;
  designer?: { name: string } | null;
  opportunity: { name: string; customer: { name: string } };
  lines: Line[];
  linkedTrips?: LinkedTrip[];
};

const tabBase = 'inline-flex h-11 items-center border-b-2 px-2 text-sm font-medium';

export default function SalesOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { push } = useToast();
  const [id, setId] = useState('');
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loadError, setLoadError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statuses, setStatuses] = useState<SalesOrderStatus[]>([]);
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplateOption[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityOption[]>([]);
  const [travelers, setTravelers] = useState<TravelerOption[]>([]);
  const [loadLists, setLoadLists] = useState<LoadList[]>([]);
  const [showLoadListModal, setShowLoadListModal] = useState(false);
  const [loadListName, setLoadListName] = useState('Load List');
  const [loadListLineIds, setLoadListLineIds] = useState<string[]>([]);
  const [customLoadItems, setCustomLoadItems] = useState<Array<{ item: string; qty: string }>>([]);
  const [creatingLoadList, setCreatingLoadList] = useState(false);
  const [showEditLoadListModal, setShowEditLoadListModal] = useState(false);
  const [editingLoadListId, setEditingLoadListId] = useState('');
  const [editingLoadListName, setEditingLoadListName] = useState('Load List');
  const [editingLoadItems, setEditingLoadItems] = useState<Array<{ item: string; qty: string; salesOrderLineId?: string | null }>>([]);
  const [savingEditLoadList, setSavingEditLoadList] = useState(false);
  const [editAddLineIds, setEditAddLineIds] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [bulkParentId, setBulkParentId] = useState('');
  const [savingHeader, setSavingHeader] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [batchProofRecipient, setBatchProofRecipient] = useState('');
  const [selectedProofIds, setSelectedProofIds] = useState<string[]>([]);
  const [sendingBatchProofs, setSendingBatchProofs] = useState(false);
  const [showProofPicker, setShowProofPicker] = useState(false);
  const [unsentProofOptions, setUnsentProofOptions] = useState<Array<{ id: string; fileName: string; mimeType: string; lineDescription: string; statusLabel: string }>>([]);
  const [proofsByLineId, setProofsByLineId] = useState<Record<string, Proof[]>>({});


  const [newProductId, setNewProductId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [showAddLineModal, setShowAddLineModal] = useState(false);
  const [newUnitPrice, setNewUnitPrice] = useState('0');
  const [newTaxable, setNewTaxable] = useState(true);
  const [newUnitCost, setNewUnitCost] = useState('0.00');
  const [newGpmPercent, setNewGpmPercent] = useState('35');

  const [title, setTitle] = useState('');
  const [statusName, setStatusName] = useState('');
  const [primaryCustomerContact, setPrimaryCustomerContact] = useState('');
  const [customerInvoiceContact, setCustomerInvoiceContact] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingAttentionTo, setBillingAttentionTo] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingAttentionTo, setShippingAttentionTo] = useState('');
  const [installAddress, setInstallAddress] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [shippingTracking, setShippingTracking] = useState('');
  const [salesOrderDate, setSalesOrderDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [installDate, setInstallDate] = useState('');
  const [shippingDate, setShippingDate] = useState('');
  const [earlyBirdDiscountDate, setEarlyBirdDiscountDate] = useState('');
  const [advancedReceivingDeadline, setAdvancedReceivingDeadline] = useState('');
  const [shipFromRoarkDate, setShipFromRoarkDate] = useState('');
  const [travelToSiteStart, setTravelToSiteStart] = useState('');
  const [travelToSiteEnd, setTravelToSiteEnd] = useState('');
  const [outboundShippingFromShowDate, setOutboundShippingFromShowDate] = useState('');
  const [estimatedInvoiceDate, setEstimatedInvoiceDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [downPaymentType, setDownPaymentType] = useState('DOLLARS');
  const [downPaymentValue, setDownPaymentValue] = useState('');
  const [salesRepId, setSalesRepId] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [designerId, setDesignerId] = useState('');
  const [opportunityId, setOpportunityId] = useState('');
  const [tripName, setTripName] = useState('');
  const [tripDestination, setTripDestination] = useState('');
  const [tripDestinationCity, setTripDestinationCity] = useState('');
  const [tripDestinationState, setTripDestinationState] = useState('');
  const [tripStartDate, setTripStartDate] = useState('');
  const [tripEndDate, setTripEndDate] = useState('');
  const [tripTravelerIds, setTripTravelerIds] = useState<string[]>([]);
  const [creatingTrip, setCreatingTrip] = useState(false);

  async function loadProofsForOrder(orderId: string) {
    const res = await fetch(`/api/proofs?lineType=SALES_ORDER_LINE&salesOrderId=${encodeURIComponent(orderId)}`);
    if (!res.ok) {
      setProofsByLineId({});
      return;
    }

    const allProofs = (await res.json()) as Array<Proof & { salesOrderLineId?: string | null }>;
    const grouped: Record<string, Proof[]> = {};
    for (const proof of allProofs) {
      const lineKey = (proof as { salesOrderLineId?: string | null }).salesOrderLineId || '';
      if (!lineKey) continue;
      if (!grouped[lineKey]) grouped[lineKey] = [];
      grouped[lineKey].push(proof);
    }
    setProofsByLineId(grouped);
  }

  async function load(orderId: string) {
    setLoadError('');
    const [soRes, pRes, usersRes, statusesRes, workflowRes, oppRes, travelerRes] = await Promise.all([
      fetch(`/api/sales-orders/${orderId}`),
      fetch('/api/admin/products'),
      fetch('/api/users'),
      fetch('/api/admin/sales-order-statuses'),
      fetch('/api/job-workflows/templates'),
      fetch('/api/opportunities'),
      fetch('/api/travel/travelers'),
    ]);
    if (soRes.ok) {
      const so = await soRes.json();
      setOrder(so);
      setTitle(so.title || '');
      setStatusName(so.status?.name || '');
      setPrimaryCustomerContact(so.primaryCustomerContact || '');
      setCustomerInvoiceContact(so.customerInvoiceContact || '');
      setBillingAddress(so.billingAddress || '');
      setBillingAttentionTo(so.billingAttentionTo || '');
      setShippingAddress(so.shippingAddress || '');
      setShippingAttentionTo(so.shippingAttentionTo || '');
      setInstallAddress(so.installAddress || '');
      setShippingMethod(so.shippingMethod || '');
      setShippingTracking(so.shippingTracking || '');
      setSalesOrderDate(so.salesOrderDate ? String(so.salesOrderDate).slice(0, 10) : '');
      setDueDate(so.dueDate ? String(so.dueDate).slice(0, 10) : '');
      setInstallDate(so.installDate ? String(so.installDate).slice(0, 10) : '');
      setShippingDate(so.shippingDate ? String(so.shippingDate).slice(0, 10) : '');
      setEarlyBirdDiscountDate(so.earlyBirdDiscountDate ? String(so.earlyBirdDiscountDate).slice(0, 10) : '');
      setAdvancedReceivingDeadline(so.advancedReceivingDeadline ? String(so.advancedReceivingDeadline).slice(0, 10) : '');
      setShipFromRoarkDate(so.shipFromRoarkDate ? String(so.shipFromRoarkDate).slice(0, 10) : '');
      setTravelToSiteStart(so.travelToSiteStart ? String(so.travelToSiteStart).slice(0, 10) : '');
      setTravelToSiteEnd(so.travelToSiteEnd ? String(so.travelToSiteEnd).slice(0, 10) : '');
      setOutboundShippingFromShowDate(so.outboundShippingFromShowDate ? String(so.outboundShippingFromShowDate).slice(0, 10) : '');
      setEstimatedInvoiceDate(so.estimatedInvoiceDate ? String(so.estimatedInvoiceDate).slice(0, 10) : '');
      setPaymentTerms(so.paymentTerms || '');
      setDownPaymentType(so.downPaymentType || 'DOLLARS');
      setDownPaymentValue(so.downPaymentValue ? String(so.downPaymentValue) : '');
      setSalesRepId(so.salesRepId || '');
      setProjectManagerId(so.projectManagerId || '');
      setDesignerId(so.designerId || '');
      setOpportunityId(so.opportunityId || '');
    } else {
      const payload = await soRes.json().catch(() => ({}));
      setLoadError(payload?.error || `Failed to load sales order (${soRes.status})`);
    }
    if (pRes.ok) setProducts(await pRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    if (statusesRes.ok) setStatuses(await statusesRes.json());
    if (workflowRes.ok) setWorkflowTemplates(await workflowRes.json());
    if (oppRes.ok) setOpportunities(await oppRes.json());
    if (travelerRes.ok) setTravelers(await travelerRes.json());
    await Promise.all([loadLoadLists(orderId), loadProofsForOrder(orderId)]);
  }

  async function loadLoadLists(orderId: string) {
    const res = await fetch(`/api/sales-orders/${orderId}/load-list`);
    if (!res.ok) {
      setLoadLists([]);
      return;
    }
    setLoadLists(await res.json());
  }

  async function createLoadList(e: React.FormEvent) {
    e.preventDefault();
    if (loadListLineIds.length === 0 && customLoadItems.every((entry) => !entry.item.trim())) {
      push('Select line items or add at least one custom item', 'error');
      return;
    }

    setCreatingLoadList(true);
    const res = await fetch(`/api/sales-orders/${id}/load-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: loadListName,
        selectedLineIds: loadListLineIds,
        customItems: customLoadItems,
      }),
    });
    setCreatingLoadList(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      push(payload?.error || 'Failed to create load list', 'error');
      return;
    }

    push('Load list created', 'success');
    setShowLoadListModal(false);
    setLoadListName('Load List');
    setLoadListLineIds([]);
    setCustomLoadItems([]);
    await loadLoadLists(id);
  }

  function openEditLoadList(list: LoadList) {
    setEditingLoadListId(list.id);
    setEditingLoadListName(list.name || 'Load List');
    setEditingLoadItems(list.items.map((i) => ({ item: i.item, qty: String(i.qty), salesOrderLineId: i.salesOrderLineId || null })));
    setEditAddLineIds([]);
    setShowEditLoadListModal(true);
  }

  function addSelectedSoLinesToEdit() {
    if (editAddLineIds.length === 0) return;

    const selected = (order?.lines || []).filter((line) => editAddLineIds.includes(line.id));
    setEditingLoadItems((prev) => {
      const existingLineIds = new Set(prev.map((row) => row.salesOrderLineId).filter(Boolean));
      const toAdd = selected
        .filter((line) => !existingLineIds.has(line.id))
        .map((line) => ({ item: line.description, qty: String(line.qty), salesOrderLineId: line.id }));
      return [...prev, ...toAdd];
    });

    setEditAddLineIds([]);
  }

  async function saveEditLoadList(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = editingLoadItems
      .map((entry) => ({ item: entry.item.trim(), qty: Number(entry.qty || 1), salesOrderLineId: entry.salesOrderLineId || null }))
      .filter((entry) => entry.item);

    if (cleaned.length === 0) {
      push('Add at least one load-list item', 'error');
      return;
    }

    setSavingEditLoadList(true);
    const res = await fetch(`/api/sales-orders/${id}/load-list/${editingLoadListId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingLoadListName, items: cleaned }),
    });
    setSavingEditLoadList(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      push(payload?.error || 'Failed to save load list', 'error');
      return;
    }

    push('Load list updated', 'success');
    setShowEditLoadListModal(false);
    setEditingLoadListId('');
    setEditingLoadItems([]);
    await loadLoadLists(id);
  }

  async function createLinkedTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!tripName.trim()) { push('Trip name is required', 'error'); return; }

    setCreatingTrip(true);
    const res = await fetch(`/api/sales-orders/${id}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: tripName.trim(),
        destinations: tripDestination,
        destinationCity: tripDestinationCity,
        destinationState: tripDestinationState,
        startDate: tripStartDate || null,
        endDate: tripEndDate || null,
        travelerIds: tripTravelerIds,
      }),
    });
    setCreatingTrip(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      push(payload?.error || 'Failed to create trip', 'error');
      return;
    }

    push('Trip created and linked to this sales order', 'success');
    setTripName('');
    setTripDestination('');
    setTripDestinationCity('');
    setTripDestinationState('');
    setTripStartDate('');
    setTripEndDate('');
    setTripTravelerIds([]);
    await load(id);
  }

  async function sendBatchProofApproval() {
    if (!batchProofRecipient.trim()) { push('Enter recipient email first', 'error'); return; }
    if (selectedProofIds.length === 0) { push('Select one or more proofs first', 'error'); return; }

    setSendingBatchProofs(true);
    const res = await fetch('/api/proofs/send-approval-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail: batchProofRecipient.trim(), proofIds: selectedProofIds }),
    });
    setSendingBatchProofs(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      push(payload?.error || 'Failed to send batch proof email', 'error');
      return;
    }
    push(`Proof approval email sent for ${selectedProofIds.length} proof(s)`, 'success');
    setSelectedProofIds([]);
  }

  async function loadUnsentProofOptions() {
    if (!order) return;

    const options = order.lines.flatMap((line) => {
      const proofs = proofsByLineId[line.id] || [];
      const latest = [...proofs].sort((a, b) => b.version - a.version || +new Date(b.createdAt) - +new Date(a.createdAt))[0];
      if (!latest) return [];
      if (latest.status === 'APPROVED' || latest.lastRequest?.decision === 'APPROVED') return [];

      return [{
        id: latest.id,
        fileName: latest.fileName,
        mimeType: latest.mimeType,
        lineDescription: line.description || 'Line item',
        statusLabel: !latest.lastRequest
          ? 'Never Sent'
          : !latest.lastRequest.respondedAt
            ? 'Sent, Pending Approval'
            : latest.lastRequest.decision === 'REVISIONS_REQUESTED'
              ? 'Sent, Rejected'
              : 'Needs Review',
      }];
    });

    setUnsentProofOptions(options);
  }

  async function saveHeader(e: React.FormEvent) {
    e.preventDefault();
    setSavingHeader(true);
    const res = await fetch(`/api/sales-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        statusName,
        primaryCustomerContact,
        customerInvoiceContact,
        billingAddress,
        billingAttentionTo,
        shippingAddress,
        shippingAttentionTo,
        installAddress,
        shippingMethod,
        shippingTracking,
        salesOrderDate: salesOrderDate || null,
        dueDate: dueDate || null,
        installDate: installDate || null,
        shippingDate: shippingDate || null,
        earlyBirdDiscountDate: earlyBirdDiscountDate || null,
        advancedReceivingDeadline: advancedReceivingDeadline || null,
        shipFromRoarkDate: shipFromRoarkDate || null,
        travelToSiteStart: travelToSiteStart || null,
        travelToSiteEnd: travelToSiteEnd || null,
        outboundShippingFromShowDate: outboundShippingFromShowDate || null,
        estimatedInvoiceDate: estimatedInvoiceDate || null,
        paymentTerms,
        downPaymentType,
        downPaymentValue,
        salesRepId: salesRepId || null,
        projectManagerId: projectManagerId || null,
        designerId: designerId || null,
        opportunityId: opportunityId || null,
      }),
    });
    if (res.ok) push('Sales order saved', 'success');
    else {
      const payload = await res.json().catch(() => ({}));
      push(payload?.error || `Failed to save sales order (${res.status})`, 'error');
    }
    await load(id);
    setSavingHeader(false);
    setEditingHeader(false);
  }

  function calculateUnitPriceFromCostGpm(unitCost: string, gpmPercent: string) {
    const cost = Number(unitCost || 0);
    const gpm = Number(gpmPercent || 0) / 100;
    if (!Number.isFinite(cost) || !Number.isFinite(gpm) || gpm >= 1) return '0.00';
    return (cost / (1 - gpm)).toFixed(2);
  }

  async function addLine(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/sales-orders/${id}/lines`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: newProductId || null, description: newDescription, qty: Number(newQty), unitPrice: Number(newUnitPrice), attributeValues: { _taxable: newTaxable ? 'true' : 'false', _unitCost: newUnitCost, _gpmPercent: newGpmPercent } }),
    });
    setNewProductId('');
    setNewDescription('');
    setNewQty('1');
    setNewUnitPrice('0');
    setNewTaxable(true);
    setNewUnitCost('0.00');
    setNewGpmPercent('35');
    setShowAddLineModal(false);
    await load(id);
  }

  async function saveLine(line: Line) {
    await fetch(`/api/sales-order-lines/${line.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(line) });
    await load(id);
  }

  async function deleteLine(lineId: string) {
    await fetch(`/api/sales-order-lines/${lineId}`, { method: 'DELETE' });
    await load(id);
  }

  async function reorderLines(lines: Line[]) {
    await fetch(`/api/sales-orders/${id}/lines/reorder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: lines.map((l, i) => ({ id: l.id, sortOrder: i + 1, parentLineId: l.parentLineId || null })) }),
    });
    await load(id);
  }

  async function moveLine(lineId: string, dir: -1 | 1) {
    const lines = [...(order?.lines || [])].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    const idx = lines.findIndex((l) => l.id === lineId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= lines.length) return;
    [lines[idx], lines[target]] = [lines[target], lines[idx]];
    await reorderLines(lines);
  }

  async function dragMoveLine(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const lines = [...(order?.lines || [])].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    const from = lines.findIndex((l) => l.id === sourceId);
    const to = lines.findIndex((l) => l.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = lines.splice(from, 1);
    lines.splice(to, 0, moved);
    await reorderLines(lines);
  }

  async function toggleCollapse(line: Line) { await saveLine({ ...line, collapsed: !line.collapsed }); }
  async function makeChild(childId: string, parentId: string | null) {
    const line = (order?.lines || []).find((l) => l.id === childId); if (!line) return;
    await saveLine({ ...line, parentLineId: parentId });
  }

  async function bulkMakeChild(parentId: string | null) {
    if (selectedLineIds.length === 0) { push('Select one or more lines first', 'error'); return; }
    const selected = (order?.lines || []).filter((l) => selectedLineIds.includes(l.id));
    await Promise.all(selected.map((line) => fetch(`/api/sales-order-lines/${line.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...line, parentLineId: parentId }),
    })));
    setSelectedLineIds([]);
    setBulkParentId('');
    await load(id);
    push('Updated rollup parent for selected lines', 'success');
  }

  const roots = useMemo(() => (order?.lines || []).filter((l) => !l.parentLineId), [order?.lines]);
  const childrenMap = useMemo(() => {
    const map = new Map<string, Line[]>();
    (order?.lines || []).forEach((l) => { if (!l.parentLineId) return; const arr = map.get(l.parentLineId) || []; arr.push(l); map.set(l.parentLineId, arr); });
    for (const [k, v] of map) map.set(k, v.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)));
    return map;
  }, [order?.lines]);

  const visibleLines = useMemo(() => {
    const out: Array<{ line: Line; depth: number }> = [];
    const sortedRoots = [...roots].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    for (const r of sortedRoots) {
      out.push({ line: r, depth: 0 });
      if (!r.collapsed) (childrenMap.get(r.id) || []).forEach((c) => out.push({ line: c, depth: 1 }));
    }
    return out.filter(({ line }) => line.description.toLowerCase().includes(filterText.trim().toLowerCase()));
  }, [roots, childrenMap, filterText]);

  const lineOwnTotals = useMemo(() => {
    const map = new Map<string, number>();
    (order?.lines || []).forEach((l) => map.set(l.id, Number(l.qty) * Number(l.unitPrice || 0)));
    return map;
  }, [order?.lines]);

  const lineDisplayTotals = useMemo(() => {
    const map = new Map<string, number>();
    (order?.lines || []).forEach((l) => {
      const kids = childrenMap.get(l.id) || [];
      if (kids.length > 0) map.set(l.id, kids.reduce((sum, k) => sum + (lineOwnTotals.get(k.id) || 0), 0));
      else map.set(l.id, lineOwnTotals.get(l.id) || 0);
    });
    return map;
  }, [order?.lines, childrenMap, lineOwnTotals]);

  const total = useMemo(() => (order?.lines || []).reduce((sum, l) => sum + Number(l.qty) * Number(l.unitPrice || 0), 0), [order?.lines]);

  const headerDirty = useMemo(() => {
    if (!order || !editingHeader) return false;
    return (
      title !== (order.title || '') ||
      statusName !== (order.status?.name || '') ||
      primaryCustomerContact !== (order.primaryCustomerContact || '') ||
      customerInvoiceContact !== (order.customerInvoiceContact || '') ||
      billingAddress !== (order.billingAddress || '') ||
      billingAttentionTo !== (order.billingAttentionTo || '') ||
      shippingAddress !== (order.shippingAddress || '') ||
      shippingAttentionTo !== (order.shippingAttentionTo || '') ||
      installAddress !== (order.installAddress || '') ||
      shippingMethod !== (order.shippingMethod || '') ||
      shippingTracking !== (order.shippingTracking || '') ||
      salesOrderDate !== (order.salesOrderDate ? String(order.salesOrderDate).slice(0, 10) : '') ||
      dueDate !== (order.dueDate ? String(order.dueDate).slice(0, 10) : '') ||
      installDate !== (order.installDate ? String(order.installDate).slice(0, 10) : '') ||
      shippingDate !== (order.shippingDate ? String(order.shippingDate).slice(0, 10) : '') ||
      earlyBirdDiscountDate !== (order.earlyBirdDiscountDate ? String(order.earlyBirdDiscountDate).slice(0, 10) : '') ||
      advancedReceivingDeadline !== (order.advancedReceivingDeadline ? String(order.advancedReceivingDeadline).slice(0, 10) : '') ||
      shipFromRoarkDate !== (order.shipFromRoarkDate ? String(order.shipFromRoarkDate).slice(0, 10) : '') ||
      travelToSiteStart !== (order.travelToSiteStart ? String(order.travelToSiteStart).slice(0, 10) : '') ||
      travelToSiteEnd !== (order.travelToSiteEnd ? String(order.travelToSiteEnd).slice(0, 10) : '') ||
      outboundShippingFromShowDate !== (order.outboundShippingFromShowDate ? String(order.outboundShippingFromShowDate).slice(0, 10) : '') ||
      estimatedInvoiceDate !== (order.estimatedInvoiceDate ? String(order.estimatedInvoiceDate).slice(0, 10) : '') ||
      paymentTerms !== (order.paymentTerms || '') ||
      downPaymentType !== (order.downPaymentType || 'DOLLARS') ||
      downPaymentValue !== (order.downPaymentValue ? String(order.downPaymentValue) : '') ||
      salesRepId !== (order.salesRepId || '') ||
      projectManagerId !== (order.projectManagerId || '') ||
      designerId !== (order.designerId || '') ||
      opportunityId !== (order.opportunityId || '')
    );
  }, [order, editingHeader, title, statusName, primaryCustomerContact, customerInvoiceContact, billingAddress, billingAttentionTo, shippingAddress, shippingAttentionTo, installAddress, shippingMethod, shippingTracking, salesOrderDate, dueDate, installDate, shippingDate, earlyBirdDiscountDate, advancedReceivingDeadline, shipFromRoarkDate, travelToSiteStart, travelToSiteEnd, outboundShippingFromShowDate, estimatedInvoiceDate, paymentTerms, downPaymentType, downPaymentValue, salesRepId, projectManagerId, designerId, opportunityId]);

  const sortedStatuses = useMemo(() => [...statuses].sort((a, b) => a.name.localeCompare(b.name)), [statuses]);
  const sortedProducts = useMemo(() => [...products].sort((a, b) => a.name.localeCompare(b.name)), [products]);
  const sortedSalesReps = useMemo(() => [...users].filter((u) => ['SALES_REP', 'SALES', 'ADMIN'].includes(u.type)).sort((a, b) => a.name.localeCompare(b.name)), [users]);
  const sortedProjectManagers = useMemo(() => [...users].filter((u) => ['PROJECT_MANAGER', 'ADMIN'].includes(u.type)).sort((a, b) => a.name.localeCompare(b.name)), [users]);
  const sortedDesigners = useMemo(() => [...users].filter((u) => ['DESIGNER', 'ADMIN'].includes(u.type)).sort((a, b) => a.name.localeCompare(b.name)), [users]);

  useUnsavedGuard(headerDirty);

  useEffect(() => { params.then((p) => { setId(p.id); load(p.id); }); }, [params]);
  if (!order && loadError) return <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-rose-700">{loadError}</main>;
  if (!order) return <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-700">Loading sales order…</main>;

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <Nav />
      <header className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Sales Order {order.orderNumber}</h1>
          <p className="mt-1 text-sm text-slate-500">{order.opportunity.name} • {order.opportunity.customer.name}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <StatusChip value={order.status?.name || 'Unknown'} />
        </div>
      </header>

      <section className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <SummaryCell label="Customer" value={order.opportunity.customer.name} />
        <SummaryCell label="Status" value={order.status?.name || 'Unknown'} />
        <SummaryCell label="Assigned Team" value={[order.salesRep?.name, order.projectManager?.name, order.designer?.name].filter(Boolean).join(', ') || 'Unassigned'} />
        <SummaryCell label="Dates" value={`${order.salesOrderDate ? new Date(order.salesOrderDate).toLocaleDateString() : '—'} • Due ${order.dueDate ? new Date(order.dueDate).toLocaleDateString() : '—'}`} />
      </section>

      <section className="mb-4 border-b border-slate-200">
        <div className="flex flex-wrap gap-4 text-slate-500">
          <button className={`${tabBase} border-sky-500 text-sky-600`}>Items ({order.lines.length})</button>
          <button className={`${tabBase} border-transparent hover:border-slate-300`}>Purchasing (0)</button>
          <button className={`${tabBase} border-transparent hover:border-slate-300`}>Tasks</button>
          <button className={`${tabBase} border-transparent hover:border-slate-300`}>Assets</button>
          <button className={`${tabBase} border-transparent hover:border-slate-300`}>Notes</button>
          <button className={`${tabBase} border-transparent hover:border-slate-300`}>Emails</button>
        </div>
      </section>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <details open>
          <summary className="cursor-pointer list-none text-base font-semibold">Sales Order Info</summary>
        {!editingHeader ? (
          <>
            <div className="mb-4 flex justify-end"><button onClick={() => setEditingHeader(true)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">Edit order info</button></div>
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <ReadField label="Title" value={order.title || '—'} />
              <ReadField label="Opportunity" value={order.opportunity.name} />
              <ReadField label="Status" value={order.status?.name || '—'} />
              <ReadField label="Primary Customer Contact" value={order.primaryCustomerContact || '—'} />
              <ReadField label="Customer Invoice Contact" value={order.customerInvoiceContact || '—'} />
              <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Schedule Dates</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <ReadField label="Sales Order Date" value={order.salesOrderDate ? new Date(order.salesOrderDate).toLocaleDateString() : '—'} />
                  <ReadField label="Due Date" value={order.dueDate ? new Date(order.dueDate).toLocaleDateString() : '—'} />
                  <ReadField label="Install Date" value={order.installDate ? new Date(order.installDate).toLocaleDateString() : '—'} />
                  <ReadField label="Shipping Date" value={order.shippingDate ? new Date(order.shippingDate).toLocaleDateString() : '—'} />
                  <ReadField label="Early Bird Discount Date" value={order.earlyBirdDiscountDate ? new Date(order.earlyBirdDiscountDate).toLocaleDateString() : '—'} />
                  <ReadField label="Advanced Receiving Deadline" value={order.advancedReceivingDeadline ? new Date(order.advancedReceivingDeadline).toLocaleDateString() : '—'} />
                  <ReadField label="Ship From Roark Date" value={order.shipFromRoarkDate ? new Date(order.shipFromRoarkDate).toLocaleDateString() : '—'} />
                  <ReadField label="Outbound Shipping from Show" value={order.outboundShippingFromShowDate ? new Date(order.outboundShippingFromShowDate).toLocaleDateString() : '—'} />
                  <ReadField label="Travel To/From Site" value={order.travelToSiteStart ? `${new Date(order.travelToSiteStart).toLocaleDateString()} → ${order.travelToSiteEnd ? new Date(order.travelToSiteEnd).toLocaleDateString() : '—'}` : '—'} />
                  <ReadField label="Estimated Invoice Date" value={order.estimatedInvoiceDate ? new Date(order.estimatedInvoiceDate).toLocaleDateString() : '—'} />
                </div>
              </div>
              <ReadField label="Shipping Method" value={order.shippingMethod || '—'} />
              <ReadField label="Shipping Tracking" value={order.shippingTracking || '—'} />
              <ReadField label="Payment Terms" value={order.paymentTerms || '—'} />
              <ReadField label="Down Payment" value={order.downPaymentValue ? `${order.downPaymentValue} ${order.downPaymentType === 'PERCENT' ? '%' : '$'}` : '—'} />
              <ReadField label="Sales Rep" value={order.salesRep?.name || '—'} />
              <ReadField label="Project Manager" value={order.projectManager?.name || '—'} />
              <ReadField label="Designer" value={order.designer?.name || '—'} />
              <ReadField label="Billing Attention To" value={order.billingAttentionTo || '—'} />
              <ReadField label="Shipping Attention To" value={order.shippingAttentionTo || '—'} />
              <div className="md:col-span-2"><ReadField label="Billing Address" value={order.billingAddress || '—'} /></div>
              <div className="md:col-span-2"><ReadField label="Shipping Address" value={order.shippingAddress || '—'} /></div>
              <div className="md:col-span-2"><ReadField label="Install Address" value={order.installAddress || '—'} /></div>
            </div>
          </>
        ) : (
          <form onSubmit={saveHeader} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} className="field" /></FormField>
            <FormField label="Opportunity"><select value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)} className="field"><option value="">Select opportunity</option>{opportunities.map((o) => <option key={o.id} value={o.id}>{o.name} — {o.customer}</option>)}</select></FormField>
            <FormField label="Status"><select value={statusName} onChange={(e) => setStatusName(e.target.value)} className="field"><option value="">Status</option>{sortedStatuses.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select></FormField>
            <FormField label="Primary Customer Contact"><input value={primaryCustomerContact} onChange={(e) => setPrimaryCustomerContact(e.target.value)} className="field" /></FormField>
            <FormField label="Customer Invoice Contact"><input value={customerInvoiceContact} onChange={(e) => setCustomerInvoiceContact(e.target.value)} className="field" /></FormField>
            <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Schedule Dates</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField label="Sales Order Date"><input type="date" value={salesOrderDate} onChange={(e) => setSalesOrderDate(e.target.value)} className="field" /></FormField>
                <FormField label="Due Date"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="field" /></FormField>
                <FormField label="Install Date"><input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} className="field" /></FormField>
                <FormField label="Shipping Date"><input type="date" value={shippingDate} onChange={(e) => setShippingDate(e.target.value)} className="field" /></FormField>
                <FormField label="Early Bird Discount Date"><input type="date" value={earlyBirdDiscountDate} onChange={(e) => setEarlyBirdDiscountDate(e.target.value)} className="field" /></FormField>
                <FormField label="Advanced Receiving Deadline"><input type="date" value={advancedReceivingDeadline} onChange={(e) => setAdvancedReceivingDeadline(e.target.value)} className="field" /></FormField>
                <FormField label="Ship From Roark Date"><input type="date" value={shipFromRoarkDate} onChange={(e) => setShipFromRoarkDate(e.target.value)} className="field" /></FormField>
                <FormField label="Outbound Shipping from Show"><input type="date" value={outboundShippingFromShowDate} onChange={(e) => setOutboundShippingFromShowDate(e.target.value)} className="field" /></FormField>
                <FormField label="Travel To Site Start"><input type="date" value={travelToSiteStart} onChange={(e) => setTravelToSiteStart(e.target.value)} className="field" /></FormField>
                <FormField label="Travel From Site End"><input type="date" value={travelToSiteEnd} onChange={(e) => setTravelToSiteEnd(e.target.value)} className="field" /></FormField>
                <FormField label="Estimated Invoice Date"><input type="date" value={estimatedInvoiceDate} onChange={(e) => setEstimatedInvoiceDate(e.target.value)} className="field" /></FormField>
              </div>
            </div>
            <FormField label="Shipping Method"><input value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)} className="field" /></FormField>
            <FormField label="Shipping Tracking"><input value={shippingTracking} onChange={(e) => setShippingTracking(e.target.value)} className="field" /></FormField>
            <FormField label="Payment Terms"><input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="field" /></FormField>
            <FormField label="Down Payment">
              <div className="grid grid-cols-2 gap-2">
                <select value={downPaymentType} onChange={(e) => setDownPaymentType(e.target.value)} className="field"><option value="DOLLARS">$</option><option value="PERCENT">%</option></select>
                <input value={downPaymentValue} onChange={(e) => setDownPaymentValue(e.target.value)} type="number" step="0.01" min="0" className="field" />
              </div>
            </FormField>
            <FormField label="Sales Rep"><select value={salesRepId} onChange={(e) => setSalesRepId(e.target.value)} className="field"><option value="">Unassigned</option>{sortedSalesReps.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></FormField>
            <FormField label="Project Manager"><select value={projectManagerId} onChange={(e) => setProjectManagerId(e.target.value)} className="field"><option value="">Unassigned</option>{sortedProjectManagers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></FormField>
            <FormField label="Designer"><select value={designerId} onChange={(e) => setDesignerId(e.target.value)} className="field"><option value="">Unassigned</option>{sortedDesigners.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></FormField>
            <FormField label="Billing Attention To"><input value={billingAttentionTo} onChange={(e) => setBillingAttentionTo(e.target.value)} className="field" /></FormField>
            <FormField label="Shipping Attention To"><input value={shippingAttentionTo} onChange={(e) => setShippingAttentionTo(e.target.value)} className="field" /></FormField>
            <div className="md:col-span-2"><AddressAutocomplete label="Billing Address" value={billingAddress} onChange={setBillingAddress} /></div>
            <div className="md:col-span-2"><AddressAutocomplete label="Shipping Address" value={shippingAddress} onChange={setShippingAddress} /></div>
            <div className="md:col-span-2"><AddressAutocomplete label="Install Address" value={installAddress} onChange={setInstallAddress} /></div>
            <div className="md:col-span-2 flex gap-2 pt-2">
              <button disabled={savingHeader} className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">{savingHeader ? 'Saving…' : 'Save Header'}</button>
              <button type="button" onClick={() => { setEditingHeader(false); load(id); }} className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        )}
        </details>
      </section>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <details open>
          <summary className="cursor-pointer list-none text-base font-semibold">Travel</summary>
        <div className="mb-3 mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">Linked by SO #{order.orderNumber}</span>
        </div>
        <form onSubmit={createLinkedTrip} className="grid grid-cols-1 gap-2 md:grid-cols-6">
          <input value={tripName} onChange={(e) => setTripName(e.target.value)} placeholder="Trip name" className="field" required />
          <input value={tripDestination} onChange={(e) => setTripDestination(e.target.value)} placeholder="Destination notes" className="field" />
          <input value={tripDestinationCity} onChange={(e) => setTripDestinationCity(e.target.value)} placeholder="Destination city" className="field" />
          <select value={tripDestinationState} onChange={(e) => setTripDestinationState(e.target.value)} className="field">
            <option value="">State…</option>
            {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'].map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
          <input value={tripStartDate} onChange={(e) => setTripStartDate(e.target.value)} type="date" className="field" />
          <input value={tripEndDate} onChange={(e) => setTripEndDate(e.target.value)} type="date" className="field" />
          <select
            multiple
            value={tripTravelerIds}
            onChange={(e) => setTripTravelerIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
            className="field h-24 md:col-span-2"
          >
            {travelers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
          </select>
          <button disabled={creatingTrip} className="inline-flex h-11 items-center justify-center rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">{creatingTrip ? 'Creating…' : 'Create Trip'}</button>
        </form>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-2">Trip</th><th className="py-2">Destination</th><th className="py-2">Dates</th><th className="py-2">Status</th><th className="py-2">Billing</th></tr></thead>
            <tbody>
              {(order.linkedTrips || []).map((trip) => (
                <tr key={trip.id} className="border-t border-slate-100">
                  <td className="py-2 font-medium"><a href={`/travel/${trip.id}`} className="text-sky-700 hover:underline">{trip.name}</a></td>
                  <td className="py-2">{trip.destinationCity && trip.destinationState ? `${trip.destinationCity}, ${trip.destinationState}` : (trip.destinations || '—')}</td>
                  <td className="py-2 text-slate-600">{trip.startDate ? new Date(trip.startDate).toLocaleDateString() : '—'} → {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : '—'}</td>
                  <td className="py-2">{trip.status}</td>
                  <td className="py-2">{trip.billable ? `Billable${trip.salesOrderRef ? ` (${trip.salesOrderRef})` : ''}` : 'Non-billable'}</td>
                </tr>
              ))}
              {(order.linkedTrips || []).length === 0 ? <tr><td colSpan={5} className="py-3 text-slate-500">No linked trips yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
        </details>
      </section>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Items & Load Lists</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => {
              setLoadListLineIds((order.lines || []).map((line) => line.id));
              setCustomLoadItems([]);
              setShowLoadListModal(true);
            }} className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Create Load List</button>
            <button onClick={() => setShowAddLineModal(true)} className="inline-flex h-10 items-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600">+ Add Line Item</button>
          </div>
        </div>
        {loadLists.length > 0 ? (
          <div className="mt-3 space-y-2">
            {loadLists.slice(0, 3).map((list) => (
              <div key={list.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                <p className="font-semibold">{list.name} • {new Date(list.createdAt).toLocaleString()}</p>
                <div className="mt-1 flex items-center justify-between">
                  <p>{list.items.length} items</p>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => openEditLoadList(list)} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100">Edit</button>
                    <a href={`/sales/orders/${id}/load-lists/${list.id}/print`} target="_blank" rel="noreferrer" className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100">Print PDF</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <details open>
          <summary className="cursor-pointer list-none text-sm font-semibold">Batch Proof Approvals</summary>
        <p className="mt-2 text-xs text-slate-500">Batch proof approvals</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input value={batchProofRecipient} onChange={(e) => setBatchProofRecipient(e.target.value)} placeholder="recipient@email.com" className="field w-full max-w-sm" />
          <button type="button" onClick={async () => { await loadUnsentProofOptions(); setShowProofPicker(true); }} className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700">Select Proofs</button>
          <button type="button" onClick={sendBatchProofApproval} disabled={sendingBatchProofs} className="inline-flex h-10 items-center rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white disabled:opacity-60">{sendingBatchProofs ? 'Sending…' : `Send Selected (${selectedProofIds.length})`}</button>
          {selectedProofIds.length > 0 ? <button type="button" onClick={() => setSelectedProofIds([])} className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700">Clear Selection</button> : null}
        </div>
        {showProofPicker ? (
          <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-2">
            {unsentProofOptions.map((proof) => (
              <label key={proof.id} className="flex items-center gap-2 rounded border border-slate-200 p-2 text-xs">
                <input
                  type="checkbox"
                  checked={selectedProofIds.includes(proof.id)}
                  onChange={(e) => setSelectedProofIds((prev) => e.target.checked ? (prev.includes(proof.id) ? prev : [...prev, proof.id]) : prev.filter((id) => id !== proof.id))}
                />
                {proof.mimeType.startsWith('image/') ? <img src={`/api/proofs/file/${proof.id}`} alt={proof.fileName} className="h-10 w-10 rounded object-cover" /> : <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-slate-100">PDF</span>}
                <span>
                  {proof.fileName} <span className="text-slate-500">• {proof.lineDescription}</span>
                  <span className="ml-2 text-[11px] text-slate-500">({proof.statusLabel})</span>
                </span>
              </label>
            ))}
            {unsentProofOptions.length === 0 ? <p className="text-xs text-slate-500">No unsent proofs found.</p> : null}
          </div>
        ) : null}
        </details>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <details open>
          <summary className="cursor-pointer list-none p-4 text-base font-semibold">Line Items</summary>
        <div className="border-b border-slate-200 p-4 space-y-2">
          <input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Filter lines..." className="field max-w-md" />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500">Selected: {selectedLineIds.length}</span>
            <select value={bulkParentId} onChange={(e) => setBulkParentId(e.target.value)} className="field h-8 w-56 text-xs">
              <option value="">Top level</option>
              {roots.filter((r) => !selectedLineIds.includes(r.id)).map((r) => <option key={r.id} value={r.id}>{r.description}</option>)}
            </select>
            <button onClick={() => bulkMakeChild(bulkParentId || null)} className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-2 font-medium">Apply rollup</button>
            <button onClick={() => setSelectedLineIds([])} className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-2 font-medium">Clear</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3 font-semibold">Sel</th><th className="px-4 py-3 font-semibold">Drag</th><th className="px-4 py-3 font-semibold">Description</th><th className="px-4 py-3 font-semibold">Qty</th><th className="px-4 py-3 font-semibold">Unit Price</th><th className="px-4 py-3 font-semibold">Line Total</th><th className="px-4 py-3 font-semibold">Actions</th></tr></thead>
            <tbody>
              {visibleLines.map(({ line, depth }) => (
                <SalesOrderLineRow
                  key={`${line.id}-${line.description}-${line.qty}-${line.unitPrice}-${line.parentLineId ?? ''}-${line.collapsed ? '1' : '0'}`}
                  line={line}
                  depth={depth}
                  roots={roots}
                  displayTotal={lineDisplayTotals.get(line.id) || 0}
                  hasChildren={(childrenMap.get(line.id) || []).length > 0}
                  onSave={saveLine}
                  onDelete={deleteLine}
                  onMove={moveLine}
                  onDragMove={dragMoveLine}
                  onToggleCollapse={toggleCollapse}
                  onMakeChild={makeChild}
                  toast={push}
                  selectedProofIds={selectedProofIds}
                  onToggleProofSelection={(proofId, selected) => {
                    setSelectedProofIds((prev) => {
                      if (selected) return prev.includes(proofId) ? prev : [...prev, proofId];
                      return prev.filter((id) => id !== proofId);
                    });
                  }}
                  selectedLineIds={selectedLineIds}
                  initialProofs={proofsByLineId[line.id] || []}
                  workflowTemplates={workflowTemplates}
                  projectCoordinatorUserId={''}
                  onToggleLineSelection={(lineId, selected) => {
                    setSelectedLineIds((prev) => selected ? (prev.includes(lineId) ? prev : [...prev, lineId]) : prev.filter((id) => id !== lineId));
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
        </details>
      </section>

      {showLoadListModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create Load List</h3>
              <button type="button" onClick={() => setShowLoadListModal(false)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Close</button>
            </div>
            <form onSubmit={createLoadList} className="space-y-3">
              <FormFieldSmall label="List Name"><input value={loadListName} onChange={(e) => setLoadListName(e.target.value)} className="field" /></FormFieldSmall>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Select sales order line items</p>
                <div className="max-h-48 space-y-1 overflow-auto rounded border border-slate-200 p-2">
                  {order.lines.map((line) => (
                    <label key={line.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={loadListLineIds.includes(line.id)}
                        onChange={(e) => setLoadListLineIds((prev) => e.target.checked ? [...new Set([...prev, line.id])] : prev.filter((id) => id !== line.id))}
                      />
                      <span>{line.description} (Qty: {line.qty})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Custom items</p>
                  <button type="button" onClick={() => setCustomLoadItems((prev) => [...prev, { item: '', qty: '1' }])} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs">+ Add custom line</button>
                </div>
                <div className="space-y-2">
                  {customLoadItems.map((entry, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2">
                      <input value={entry.item} onChange={(e) => setCustomLoadItems((prev) => prev.map((row, i) => i === idx ? { ...row, item: e.target.value } : row))} placeholder="Item" className="field col-span-8" />
                      <input value={entry.qty} onChange={(e) => setCustomLoadItems((prev) => prev.map((row, i) => i === idx ? { ...row, qty: e.target.value } : row))} type="number" min="1" className="field col-span-2" />
                      <button type="button" onClick={() => setCustomLoadItems((prev) => prev.filter((_, i) => i !== idx))} className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700 col-span-2">Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowLoadListModal(false)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs">Cancel</button>
                <button disabled={creatingLoadList} className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{creatingLoadList ? 'Creating…' : 'Create Load List'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showEditLoadListModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 className="text-lg font-semibold">Edit Load List</h3>
              <button type="button" onClick={() => { setShowEditLoadListModal(false); setEditAddLineIds([]); }} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Close</button>
            </div>
            <form onSubmit={saveEditLoadList} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <FormFieldSmall label="List Name"><input value={editingLoadListName} onChange={(e) => setEditingLoadListName(e.target.value)} className="field" /></FormFieldSmall>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add sales order line items</p>
                  <button type="button" onClick={addSelectedSoLinesToEdit} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs">Add Selected Lines</button>
                </div>
                <div className="max-h-36 space-y-1 overflow-auto rounded border border-slate-200 p-2">
                  {(order?.lines || []).map((line) => {
                    const alreadyIncluded = editingLoadItems.some((row) => row.salesOrderLineId === line.id);
                    return (
                      <label key={line.id} className={`flex items-center gap-2 text-sm ${alreadyIncluded ? 'text-slate-400' : 'text-slate-700'}`}>
                        <input
                          type="checkbox"
                          disabled={alreadyIncluded}
                          checked={alreadyIncluded || editAddLineIds.includes(line.id)}
                          onChange={(e) => setEditAddLineIds((prev) => e.target.checked ? [...new Set([...prev, line.id])] : prev.filter((id) => id !== line.id))}
                        />
                        <span>{line.description} (Qty: {line.qty}){alreadyIncluded ? ' — already in list' : ''}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                {editingLoadItems.map((entry, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input value={entry.item} onChange={(e) => setEditingLoadItems((prev) => prev.map((row, i) => i === idx ? { ...row, item: e.target.value } : row))} placeholder="Item" className="field col-span-8" />
                    <input value={entry.qty} onChange={(e) => setEditingLoadItems((prev) => prev.map((row, i) => i === idx ? { ...row, qty: e.target.value } : row))} type="number" min="1" className="field col-span-2" />
                    <button type="button" onClick={() => setEditingLoadItems((prev) => prev.filter((_, i) => i !== idx))} className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700 col-span-2">Remove</button>
                  </div>
                ))}
              </div>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setEditingLoadItems((prev) => [...prev, { item: '', qty: '1', salesOrderLineId: null }])} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs">+ Add item</button>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 bg-white p-4">
                <button type="button" onClick={() => { setShowEditLoadListModal(false); setEditAddLineIds([]); }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs">Cancel</button>
                <button disabled={savingEditLoadList} className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{savingEditLoadList ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showAddLineModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add Line Item</h3>
              <button type="button" onClick={() => setShowAddLineModal(false)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Close</button>
            </div>
            <form onSubmit={addLine} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <FormFieldSmall label="Product">
                  <select value={newProductId} onChange={(e) => { const pid = e.target.value; setNewProductId(pid); const p = products.find((x) => x.id === pid); if (p) { setNewDescription(p.name); setNewUnitPrice(String(p.salePrice)); } }} className="field">
                    <option value="">Custom / no product</option>{sortedProducts.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                  </select>
                </FormFieldSmall>
                <FormFieldSmall label="Description"><input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="field" required /></FormFieldSmall>
                <FormFieldSmall label="Quantity"><input value={newQty} onChange={(e) => setNewQty(e.target.value)} type="number" min="1" className="field" required /></FormFieldSmall>
                <FormFieldSmall label="Unit Price"><input value={newUnitPrice} onChange={(e) => setNewUnitPrice(e.target.value)} type="number" min="0" step="0.01" className="field" required /></FormFieldSmall>
                <FormFieldSmall label="Taxable"><span className="field flex items-center"><input type="checkbox" checked={newTaxable} onChange={(e) => setNewTaxable(e.target.checked)} /></span></FormFieldSmall>
                <div className="flex items-end"><button className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600">Create Line</button></div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <FormFieldSmall label="Unit Cost"><input value={newUnitCost} onChange={(e) => { const v = e.target.value; setNewUnitCost(v); setNewUnitPrice(calculateUnitPriceFromCostGpm(v, newGpmPercent)); }} type="number" min="0" step="0.01" className="field" /></FormFieldSmall>
                <FormFieldSmall label="GPM %"><input value={newGpmPercent} onChange={(e) => { const v = e.target.value; setNewGpmPercent(v); setNewUnitPrice(calculateUnitPriceFromCostGpm(newUnitCost, v)); }} type="number" min="0" max="99.99" step="0.01" className="field" /></FormFieldSmall>
                <FormFieldSmall label="Extended Price"><input value={(Number(newQty || 0) * Number(newUnitPrice || 0)).toFixed(2)} disabled className="field bg-slate-100" /></FormFieldSmall>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="sticky bottom-2 mt-4 ml-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 text-sm shadow">
        <p className="flex justify-between text-lg font-semibold"><span>Total</span><span>${total.toFixed(2)}</span></p>
      </div>

      <ModuleNotesTasks entityType="SALES_ORDER" entityId={id} />
    </main>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="mt-1 block text-sm text-slate-800">{value}</span>
    </p>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function FormFieldSmall({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function SalesOrderLineRow({ line, depth, roots, displayTotal, hasChildren, onSave, onDelete, onMove, onDragMove, onToggleCollapse, onMakeChild, toast, selectedProofIds, onToggleProofSelection, selectedLineIds, initialProofs, workflowTemplates, projectCoordinatorUserId, onToggleLineSelection }: { line: Line; depth: number; roots: Line[]; displayTotal: number; hasChildren: boolean; onSave: (line: Line) => void; onDelete: (id: string) => void; onMove: (id: string, dir: -1 | 1) => void; onDragMove: (sourceId: string, targetId: string) => void; onToggleCollapse: (line: Line) => void; onMakeChild: (id: string, parentId: string | null) => void; toast: (message: string, variant?: 'success' | 'error' | 'info') => void; selectedProofIds: string[]; onToggleProofSelection: (proofId: string, selected: boolean) => void; selectedLineIds: string[]; initialProofs: Proof[]; workflowTemplates: WorkflowTemplateOption[]; projectCoordinatorUserId?: string; onToggleLineSelection: (lineId: string, selected: boolean) => void }) {
  const [draft, setDraft] = useState<Line>(line);
  const [dirty, setDirty] = useState(false);
  const [showProofs, setShowProofs] = useState(false);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofEmail, setProofEmail] = useState('');
  const [sendingProofId, setSendingProofId] = useState('');
  const [selectedWorkflowTemplateId, setSelectedWorkflowTemplateId] = useState('');
  const [creatingJob, setCreatingJob] = useState(false);
  const [jobId, setJobId] = useState('');
  const [jobState, setJobState] = useState<'NONE' | 'IN_PROGRESS' | 'DONE'>('NONE');
  const [proofState, setProofState] = useState<'NONE' | 'UNSENT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESEND_NEEDED'>('NONE');

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => onSave(draft), 700);
    return () => clearTimeout(t);
  }, [draft, dirty, onSave]);

  async function loadProofs() {
    const res = await fetch(`/api/proofs?lineType=SALES_ORDER_LINE&lineId=${line.id}`);
    if (!res.ok) return;
    const nextProofs = (await res.json()) as Proof[];
    setProofs(nextProofs);

    if (nextProofs.length === 0) {
      setProofState('NONE');
      return;
    }

    const latest = [...nextProofs].sort((a, b) => b.version - a.version || +new Date(b.createdAt) - +new Date(a.createdAt))[0];
    const hasRejectedHistory = nextProofs.some((p) => p.status === 'REVISIONS_REQUESTED');

    if (!latest.lastRequest && hasRejectedHistory) setProofState('RESEND_NEEDED');
    else if (latest.status === 'REVISIONS_REQUESTED') setProofState('REJECTED');
    else if (latest.lastRequest && !latest.lastRequest.respondedAt) setProofState('PENDING');
    else if (!latest.lastRequest) setProofState('UNSENT');
    else if (latest.status === 'APPROVED') setProofState('APPROVED');
    else setProofState('UNSENT');
  }

  async function uploadProof() {
    if (!proofFile) return;
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(proofFile);
    });

    const res = await fetch('/api/proofs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineType: 'SALES_ORDER_LINE', lineId: line.id, fileName: proofFile.name, mimeType: proofFile.type || 'application/octet-stream', base64Data }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast(typeof payload?.error === 'string' ? payload.error : 'Failed to upload proof', 'error');
      return;
    }
    setProofFile(null);
    toast('Proof uploaded', 'success');
    await loadProofs();
  }

  async function sendProofApproval(proofId: string) {
    if (!proofEmail.trim()) { toast('Enter recipient email first', 'error'); return; }
    setSendingProofId(proofId);
    const res = await fetch(`/api/proofs/${proofId}/send-approval`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipientEmail: proofEmail.trim() }),
    });
    setSendingProofId('');
    if (!res.ok) { toast('Failed to send proof approval', 'error'); return; }
    toast('Proof approval email sent', 'success');
    await loadProofs();
  }

  async function loadJobState() {
    const res = await fetch(`/api/sales-order-lines/${line.id}/jobs`);
    if (!res.ok) return;
    const payload = await res.json().catch(() => ({}));

    if (!payload?.hasJob) {
      setJobId('');
      setJobState('NONE');
      return;
    }

    setJobId(typeof payload?.jobId === 'string' ? payload.jobId : '');
    if (payload?.workflowStatus === 'DONE') setJobState('DONE');
    else setJobState('IN_PROGRESS');
  }

  async function createJobFromApprovedProof() {
    if (creatingJob) return;

    if (jobState !== 'NONE' && jobId) {
      window.location.href = `/jobs/${jobId}`;
      return;
    }

    setCreatingJob(true);

    try {
      const res = await fetch(`/api/sales-order-lines/${line.id}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowTemplateId: selectedWorkflowTemplateId || null,
          projectCoordinatorUserId: projectCoordinatorUserId || null,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(typeof payload?.error === 'string' ? payload.error : 'Failed to create job', 'error');
        return;
      }

      toast('Job created from approved proof', 'success');
      await loadJobState();
    } finally {
      setCreatingJob(false);
    }
  }

  useEffect(() => {
    setProofs(initialProofs || []);
    const nextProofs = initialProofs || [];
    if (nextProofs.length === 0) {
      setProofState('NONE');
      return;
    }
    const latest = [...nextProofs].sort((a, b) => b.version - a.version || +new Date(b.createdAt) - +new Date(a.createdAt))[0];
    const hasRejectedHistory = nextProofs.some((p) => p.status === 'REVISIONS_REQUESTED');
    if (!latest.lastRequest && hasRejectedHistory) setProofState('RESEND_NEEDED');
    else if (latest.status === 'REVISIONS_REQUESTED') setProofState('REJECTED');
    else if (latest.lastRequest && !latest.lastRequest.respondedAt) setProofState('PENDING');
    else if (!latest.lastRequest) setProofState('UNSENT');
    else if (latest.status === 'APPROVED') setProofState('APPROVED');
    else setProofState('UNSENT');
  }, [initialProofs]);

  useEffect(() => {
    loadJobState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line.id]);

  useEffect(() => {
    if (!showProofs) return;
    loadProofs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showProofs]);

  return (
    <>
    <tr className="border-t border-slate-100" onDragOver={(e) => e.preventDefault()} onDragEnter={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const sourceId = e.dataTransfer.getData('text/plain'); if (sourceId) onDragMove(sourceId, line.id); }}>
      <td className="px-4 py-4 align-top"><input type="checkbox" checked={selectedLineIds.includes(line.id)} onChange={(e) => onToggleLineSelection(line.id, e.target.checked)} /></td>
      <td className="px-4 py-4 align-top">
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', line.id);
          }}
          className="inline-flex cursor-grab select-none rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-500"
          title="Drag to reorder"
        >
          ⋮⋮
        </span>
      </td>
      <td className="px-4 py-4">
        <div style={{ paddingLeft: `${depth * 22}px` }} className="flex items-center gap-2">
          {depth === 0 ? <button onClick={() => onToggleCollapse(line)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">{line.collapsed ? '+' : '-'}</button> : <span className="text-slate-400">↳</span>}
          <input value={draft.description} onChange={(e) => { setDirty(true); setDraft({ ...draft, description: e.target.value }); }} className="field w-full" />
        </div>
      </td>
      <td className="px-4 py-4"><input value={draft.qty} onChange={(e) => { setDirty(true); setDraft({ ...draft, qty: Number(e.target.value) }); }} type="number" min="1" className="field w-24" /></td>
      <td className="px-4 py-4"><input value={draft.unitPrice} onChange={(e) => { setDirty(true); setDraft({ ...draft, unitPrice: Number(e.target.value) }); }} type="number" min="0" step="0.01" className="field w-32" /></td>
      <td className="px-4 py-4 font-medium text-slate-700">${displayTotal.toFixed(2)}{hasChildren ? ' (rollup)' : ''}</td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-1">
          <button onClick={() => onSave(draft)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50">Save</button>
          <button onClick={() => onDelete(line.id)} className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100">Delete</button>
          <button onClick={() => onMove(line.id, -1)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">↑</button>
          <button onClick={() => onMove(line.id, 1)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">↓</button>
          <button
            onClick={() => setShowProofs((v) => !v)}
            className={`rounded-md border px-2 py-1 text-xs ${
              proofState === 'NONE' ? 'border-slate-300 bg-slate-50 text-slate-500' :
              proofState === 'UNSENT' ? 'border-sky-300 bg-sky-50 text-sky-700' :
              proofState === 'PENDING' ? 'border-amber-300 bg-amber-50 text-amber-700' :
              proofState === 'RESEND_NEEDED' ? 'border-orange-300 bg-orange-50 text-orange-700' :
              proofState === 'APPROVED' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
              'border-rose-300 bg-rose-50 text-rose-700'
            }`}
          >
            {showProofs ? 'Hide Proofs' : 'Proofs'}
          </button>
          <button
            type="button"
            onClick={createJobFromApprovedProof}
            disabled={creatingJob}
            className={`rounded-md border px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
              jobState === 'DONE'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : jobState === 'IN_PROGRESS'
                  ? 'border-orange-300 bg-orange-50 text-orange-700'
                  : 'border-slate-300 bg-slate-50 text-slate-700'
            }`}
            title={
              jobState === 'NONE'
                ? 'Create a job from this line'
                : jobState === 'IN_PROGRESS'
                  ? 'Open job (workflow in progress)'
                  : 'Open job (workflow completed)'
            }
          >
            {creatingJob ? 'Creating…' : jobState === 'NONE' ? 'Create Job' : 'Job'}
          </button>
          <select value={selectedWorkflowTemplateId} onChange={(e) => setSelectedWorkflowTemplateId(e.target.value)} className="field h-8 w-44 text-xs">
            <option value="">No workflow</option>
            {workflowTemplates.map((wf) => <option key={wf.id} value={wf.id}>{wf.name}</option>)}
          </select>
          <select value={line.parentLineId || ''} onChange={(e) => onMakeChild(line.id, e.target.value || null)} className="field h-8 w-40 text-xs">
            <option value="">Top level</option>
            {roots.filter((r) => r.id !== line.id).map((r) => <option key={r.id} value={r.id}>{r.description}</option>)}
          </select>
        </div>
      </td>
    </tr>
    {showProofs ? (
      <tr className="border-t border-slate-100 bg-slate-50/60">
        <td className="px-4 py-3" colSpan={7}>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <label className="text-xs text-slate-600 md:col-span-2">Upload proof
              <div className="mt-1 flex gap-2">
                <input type="file" onChange={(e) => setProofFile(e.target.files?.[0] || null)} className="field" />
                <button type="button" onClick={uploadProof} className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-white">Upload</button>
              </div>
            </label>
            <label className="text-xs text-slate-600">Approval email
              <input value={proofEmail} onChange={(e) => setProofEmail(e.target.value)} placeholder="customer@email.com" className="field mt-1" />
            </label>
          </div>
          <div className="mt-2 space-y-2">
            {proofs.map((proof) => (
              <div key={proof.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-2 text-xs">
                <div>
                  <p className="font-medium">v{proof.version} • {proof.fileName}</p>
                  <p className="text-slate-500">{proof.status}{proof.approvalNotes ? ` • ${proof.approvalNotes}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                    <input type="checkbox" checked={selectedProofIds.includes(proof.id)} onChange={(e) => onToggleProofSelection(proof.id, e.target.checked)} />
                    Select
                  </label>
                  <a href={`/api/proofs/file/${proof.id}`} target="_blank" rel="noreferrer" className="text-sky-700">Open</a>
                  <button type="button" onClick={() => sendProofApproval(proof.id)} disabled={sendingProofId === proof.id} className="rounded-md border border-slate-300 bg-white px-2 py-1">{sendingProofId === proof.id ? 'Sending…' : 'Send'}</button>
                </div>
              </div>
            ))}
            {proofs.length === 0 ? <p className="text-xs text-slate-500">No proofs uploaded yet for this line.</p> : null}
          </div>
        </td>
      </tr>
    ) : null}
  </>
  );
}
