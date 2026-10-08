"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Banknote, Camera, Check, CheckCircle2,
  ChevronLeft, ChevronRight, CircleDollarSign, Gem, House, Loader2, LogOut,
  PackageCheck, Plus, ReceiptText, RefreshCw, Search, Sparkles, WalletCards,
  WifiOff, X,
} from "lucide-react";

type Order = {
  id: number; customerName: string; customerPhone: string; itemName: string;
  category: string; photoKey: string | null; sellingPrice: number;
  wholesalePrice: number | null; extraCosts: number; amountPaid: number;
  paymentMethod: string; status: string; dueDate: string; notes: string;
  createdAt: string;
};
type Expense = { id: number; title: string; amount: number; expenseDate: string };
type View = "today" | "orders" | "money";
type OrderFilter = "attention" | "active" | "ready" | "unpaid" | "all";
type SyncState = "saved" | "saving" | "offline";

const statuses = ["New order", "Sourcing item", "Item purchased", "Ready", "Delivered", "Completed"];
const terminalStatuses = new Set(["Completed", "Cancelled", "Refunded"]);
const blank = {
  customerName: "", customerPhone: "", itemName: "", category: "Jewelry",
  sellingPrice: "", wholesalePrice: "", extraCosts: "", amountPaid: "",
  paymentMethod: "Cash", status: "New order", dueDate: "", notes: "",
};

const ugx = (amount: number) => `UGX ${Math.round(amount).toLocaleString("en-UG")}`;
const shortDate = (value: string) => value
  ? new Intl.DateTimeFormat("en-UG", { day: "numeric", month: "short" }).format(new Date(value))
  : "No date set";
function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function orderProfit(order: Order) {
  return order.wholesalePrice == null ? null : order.sellingPrice - order.wholesalePrice - order.extraCosts;
}
function isAttentionOrder(order: Order) {
  if (["Cancelled", "Refunded"].includes(order.status)) return false;
  const overdue = Boolean(order.dueDate && order.dueDate < new Date().toISOString().slice(0, 10) && !["Delivered", "Completed"].includes(order.status));
  const unpaid = ["Delivered", "Completed"].includes(order.status) && order.amountPaid < order.sellingPrice;
  return order.wholesalePrice == null || overdue || unpaid || order.status === "Ready";
}
function nextStatus(status: string) {
  const index = statuses.indexOf(status);
  return index >= 0 && index < statuses.length - 1 ? statuses[index + 1] : null;
}

export default function ProfitLensApp() {
  const router = useRouter();
  const [view, setView] = useState<View>("today");
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OrderFilter>("attention");
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrder, setShowOrder] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [form, setForm] = useState(blank);
  const [orderStep, setOrderStep] = useState(1);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("saved");
  const [toast, setToast] = useState<{ message: string; actionLabel?: string; action?: () => void } | null>(null);
  const [expenseForm, setExpenseForm] = useState({ title: "", amount: "", expenseDate: new Date().toISOString().slice(0, 10) });

  async function loadRecords() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/orders");
      const data = await response.json();
      if (response.status === 401) { router.replace("/login"); return; }
      if (!response.ok) throw new Error(data.error);
      setOrders(data.orders); setExpenses(data.expenses);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your records could not be loaded. Check your connection and try again.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    async function loadInitialRecords() {
      try {
        const response = await fetch("/api/orders");
        const data = await response.json();
        if (response.status === 401) { router.replace("/login"); return; }
        if (!response.ok) throw new Error(data.error);
        if (active) { setOrders(data.orders); setExpenses(data.expenses); }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Your records could not be loaded. Check your connection and try again.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInitialRecords();
    return () => { active = false; };
  }, [router]);
  useEffect(() => {
    const online = () => setSyncState("saved");
    const offline = () => setSyncState("offline");
    window.addEventListener("online", online); window.addEventListener("offline", offline);
    if (!navigator.onLine) offline();
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, []);
  useEffect(() => {
    if (showOrder) window.localStorage.setItem("profitlens-order-draft", JSON.stringify(form));
  }, [form, showOrder]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setSelectedOrder(null); setShowOrder(false); setShowExpense(false); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        const savedDraft = window.localStorage.getItem("profitlens-order-draft");
        if (savedDraft) { try { setForm({ ...blank, ...JSON.parse(savedDraft) }); } catch { setForm(blank); } }
        setOrderStep(1); setShowOrder(true); setError("");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const selectedMonth = useMemo(() => {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() + monthOffset); return date;
  }, [monthOffset]);
  const selectedMonthKey = monthKey(selectedMonth);
  const previousMonth = new Date(selectedMonth); previousMonth.setMonth(previousMonth.getMonth() - 1);
  const previousMonthKey = monthKey(previousMonth);
  const monthLabel = new Intl.DateTimeFormat("en-UG", { month: "long", year: "numeric" }).format(selectedMonth);
  const monthOrders = orders.filter((order) => order.createdAt.slice(0, 7) === selectedMonthKey && !["Cancelled", "Refunded"].includes(order.status));
  const completed = monthOrders.filter((order) => ["Delivered", "Completed"].includes(order.status));
  const sales = completed.reduce((sum, order) => sum + order.sellingPrice, 0);
  const expenseTotal = expenses.filter((expense) => expense.expenseDate.slice(0, 7) === selectedMonthKey).reduce((sum, expense) => sum + expense.amount, 0);
  const confirmedGross = completed.filter((order) => order.wholesalePrice != null).reduce((sum, order) => sum + (orderProfit(order) ?? 0), 0);
  const netProfit = confirmedGross - expenseTotal;
  const previousSales = orders.filter((order) => order.createdAt.slice(0, 7) === previousMonthKey && ["Delivered", "Completed"].includes(order.status)).reduce((sum, order) => sum + order.sellingPrice, 0);
  const outstanding = monthOrders.reduce((sum, order) => sum + Math.max(0, order.sellingPrice - order.amountPaid), 0);
  const missingCosts = monthOrders.filter((order) => order.wholesalePrice == null).length;
  const attentionOrders = orders.filter(isAttentionOrder);
  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch = `${order.customerName} ${order.itemName} ${order.customerPhone} ${order.status}`.toLowerCase().includes(normalized);
      const matchesFilter = filter === "all" || (filter === "attention" && isAttentionOrder(order)) || (filter === "active" && !terminalStatuses.has(order.status)) || (filter === "ready" && order.status === "Ready") || (filter === "unpaid" && order.amountPaid < order.sellingPrice);
      return matchesSearch && matchesFilter;
    });
  }, [filter, orders, query]);
  const liveSale = Number(form.sellingPrice) || 0;
  const liveCost = form.wholesalePrice === "" ? null : Number(form.wholesalePrice) || 0;
  const liveProfit = liveCost == null ? null : liveSale - liveCost - (Number(form.extraCosts) || 0);

  function field(name: keyof typeof blank, value: string) { setForm((current) => ({ ...current, [name]: value })); }
  function openOrder() {
    const savedDraft = window.localStorage.getItem("profitlens-order-draft");
    if (savedDraft) { try { setForm({ ...blank, ...JSON.parse(savedDraft) }); } catch { setForm(blank); } }
    setOrderStep(1); setShowOrder(true); setError("");
  }
  function closeOrder(clearDraft = false) {
    setShowOrder(false); setOrderStep(1); setPhoto(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(""); setError("");
    if (clearDraft) { setForm(blank); window.localStorage.removeItem("profitlens-order-draft"); }
  }
  function continueOrder() {
    if (orderStep === 1 && (!form.itemName.trim() || Number(form.sellingPrice) <= 0)) { setError("Add the item name and selling price before continuing."); return; }
    setError(""); setOrderStep((current) => Math.min(3, current + 1));
  }
  async function saveOrder(event: React.FormEvent) {
    event.preventDefault();
    const paid = Number(form.amountPaid) || 0;
    if (paid > liveSale) { setError("The amount received cannot be more than the selling price."); return; }
    if (!form.customerName.trim()) { setError("Add the customer name so you can identify this order later."); return; }
    setSaving(true); setSyncState("saving"); setError("");
    try {
      let photoKey = null;
      if (photo) {
        const photoForm = new FormData(); photoForm.append("photo", photo);
        const uploadResponse = await fetch("/api/uploads", { method: "POST", body: photoForm });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.error);
        photoKey = uploadData.key;
      }
      const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, photoKey }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setOrders((current) => [data.order, ...current]); closeOrder(true); setView("orders"); setFilter("active"); setSelectedOrder(data.order);
      setToast({ message: `${data.order.itemName} is now in your order book.` }); setSyncState("saved");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This order has not been saved. Your information is still here—try again.");
      setSyncState(navigator.onLine ? "saved" : "offline");
    } finally { setSaving(false); }
  }
  async function saveExpense(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setSyncState("saving"); setError("");
    try {
      const response = await fetch("/api/expenses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(expenseForm) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setExpenses((current) => [data.expense, ...current]); setShowExpense(false);
      setExpenseForm({ title: "", amount: "", expenseDate: new Date().toISOString().slice(0, 10) });
      setToast({ message: `${data.expense.title} was added to your money book.` }); setSyncState("saved");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This cost was not saved. Try again.");
      setSyncState(navigator.onLine ? "saved" : "offline");
    } finally { setSaving(false); }
  }
  async function updateOrder(order: Order, changes: Partial<Order>, options: { offerUndo?: boolean } = {}) {
    const previous = { ...order }; setSyncState("saving"); setError("");
    try {
      const response = await fetch("/api/orders", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: order.id, ...changes }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...data.order } : item));
      setSelectedOrder((current) => current?.id === order.id ? { ...current, ...data.order } : current); setSyncState("saved");
      const summary = changes.status ? `${order.itemName} moved to ${changes.status.toLowerCase()}.` : `${order.itemName} payment was updated.`;
      setToast(options.offerUndo ? { message: summary, actionLabel: "Undo", action: () => { void updateOrder(previous, { status: previous.status, amountPaid: previous.amountPaid }); } } : { message: summary });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This change was not saved. Try again.");
      setSyncState(navigator.onLine ? "saved" : "offline");
    }
  }
  async function signOut() { await fetch("/api/auth/signout", { method: "POST" }); router.replace("/login"); router.refresh(); }

  return <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#f5f1e7] text-[#203028]">
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-[#d9ddd4] bg-[#fffdf8] px-5 py-6 lg:flex">
      <Brand />
      <nav className="mt-10 space-y-1" aria-label="Main navigation">
        <NavItem active={view === "today"} icon={<House />} label="Overview" onClick={() => setView("today")} />
        <NavItem active={view === "orders"} icon={<PackageCheck />} label="Orders" count={attentionOrders.length} onClick={() => setView("orders")} />
        <NavItem active={view === "money"} icon={<ReceiptText />} label="Expenses & profit" onClick={() => setView("money")} />
      </nav>
      <button onClick={openOrder} className="primary mt-7 w-full justify-center"><Plus /> Record order</button>
      <div className="mt-auto"><div className="rounded-2xl bg-[#e6f3e7] p-4"><Sparkles className="h-5 w-5 text-[#1d6b3a]" /><p className="mt-4 text-sm font-bold">Know every shilling.</p><p className="mt-2 text-xs leading-5 text-[#52705d]">Add the wholesale cost to see your true profit.</p></div><div className="mt-5 border-t border-[#e5e4de] pt-5"><SyncIndicator state={syncState} /><button onClick={signOut} className="mt-4 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#617067] hover:bg-[#f4f1e9]"><LogOut className="h-4 w-4" /> Sign out</button></div></div>
    </aside>
    <main className="w-full min-w-0 max-w-full overflow-x-hidden pb-28 lg:ml-64 lg:w-auto lg:pb-10">
      <header className="sticky top-0 z-30 flex min-h-[72px] w-full min-w-0 items-center justify-between gap-3 border-b border-[#dedfd8] bg-[#f5f1e7]/95 px-4 backdrop-blur sm:px-6 lg:px-10">
        <div className="min-w-0 lg:hidden"><Brand small /></div>
        <div className="hidden lg:block"><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#7b8079]">Your working bench</p><p className="mt-1 text-sm text-[#526158]">{attentionOrders.length ? `${attentionOrders.length} orders need attention` : "Everything is in order"}</p></div>
        <div className="flex shrink-0 items-center gap-2"><span className="hidden sm:block lg:hidden"><SyncIndicator state={syncState} compact /></span><button onClick={openOrder} className="primary"><Plus /><span className="hidden sm:inline">Record order</span><span className="sm:hidden">Add</span></button></div>
      </header>
      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
        {error && <ErrorBanner message={error} retry={loadRecords} close={() => setError("")} />}
        {view === "today" && <TodayView loading={loading} attention={attentionOrders} sales={sales} salesDifference={sales - previousSales} profit={netProfit} outstanding={outstanding} missingCosts={missingCosts} monthLabel={monthLabel} onPreviousMonth={() => setMonthOffset((value) => value - 1)} onNextMonth={() => setMonthOffset((value) => Math.min(0, value + 1))} canGoForward={monthOffset < 0} onOpenOrder={setSelectedOrder} onAdd={openOrder} onSeeOrders={() => setView("orders")} />}
        {view === "orders" && <OrdersView orders={filteredOrders} loading={loading} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} onAdd={openOrder} onOpen={setSelectedOrder} />}
        {view === "money" && <MoneyView monthLabel={monthLabel} sales={sales} profit={netProfit} expenses={expenses.filter((expense) => expense.expenseDate.slice(0, 7) === selectedMonthKey)} expenseTotal={expenseTotal} outstanding={outstanding} missingCosts={missingCosts} onPreviousMonth={() => setMonthOffset((value) => value - 1)} onNextMonth={() => setMonthOffset((value) => Math.min(0, value + 1))} canGoForward={monthOffset < 0} onAddExpense={() => setShowExpense(true)} />}
      </div>
    </main>
    <nav className="mobile-nav" aria-label="Mobile navigation"><MobileNav active={view === "today"} icon={<House />} label="Overview" onClick={() => setView("today")} /><MobileNav active={view === "orders"} icon={<PackageCheck />} label="Orders" onClick={() => setView("orders")} /><MobileNav active={view === "money"} icon={<ReceiptText />} label="Money" onClick={() => setView("money")} /></nav>
    {showOrder && <OrderFlow step={orderStep} form={form} field={field} preview={preview} choose={(file) => { if (file) { setPhoto(file); setPreview(URL.createObjectURL(file)); } }} profit={liveProfit} sale={liveSale} back={() => setOrderStep((current) => Math.max(1, current - 1))} next={continueOrder} close={() => closeOrder(false)} discard={() => closeOrder(true)} submit={saveOrder} saving={saving} error={error} />}
    {showExpense && <ExpenseModal form={expenseForm} setForm={setExpenseForm} close={() => setShowExpense(false)} submit={saveExpense} saving={saving} />}
    {selectedOrder && <OrderDetail order={selectedOrder} close={() => setSelectedOrder(null)} update={updateOrder} />}
    {toast && <Toast message={toast.message} actionLabel={toast.actionLabel} action={toast.action} close={() => setToast(null)} />}
  </div>;
}

function TodayView({ loading, attention, sales, salesDifference, profit, outstanding, missingCosts, monthLabel, onPreviousMonth, onNextMonth, canGoForward, onOpenOrder, onAdd, onSeeOrders }: {
  loading: boolean; attention: Order[]; sales: number; salesDifference: number; profit: number;
  outstanding: number; missingCosts: number; monthLabel: string; onPreviousMonth: () => void;
  onNextMonth: () => void; canGoForward: boolean; onOpenOrder: (order: Order) => void; onAdd: () => void; onSeeOrders: () => void;
}) {
  return <>
    <section className="mb-7 flex min-w-0 flex-wrap items-end justify-between gap-4"><div className="min-w-0"><p className="eyebrow">{monthLabel.toUpperCase()} OVERVIEW</p><h1 className="max-w-2xl break-words text-3xl font-bold tracking-[-.04em] sm:text-4xl">Your business at a glance</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#5f6d64]">Profit is counted when an order is delivered or completed.</p></div><MonthPicker label={monthLabel} previous={onPreviousMonth} next={onNextMonth} canGoForward={canGoForward} /></section>
    <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Completed sales" value={ugx(sales)} note={`${salesDifference >= 0 ? "+" : ""}${ugx(salesDifference)} vs previous month`} icon={<WalletCards />} />
      <Metric label="Net profit" value={ugx(profit)} note={missingCosts ? `${missingCosts} costs still need recording` : "After all recorded costs"} tone={profit >= 0 ? "good" : "danger"} icon={<CircleDollarSign />} />
      <Metric label="Customer balances" value={ugx(outstanding)} note={outstanding ? "Still to be collected" : "All recorded payments settled"} tone={outstanding ? "warning" : "good"} icon={<Banknote />} />
      <Metric label="Costs missing" value={missingCosts.toLocaleString("en-UG")} note="Need a wholesale price" tone={missingCosts ? "warning" : "good"} icon={<Gem />} />
    </section>
    <section className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.9fr)]">
      <div className="ledger-panel min-w-0"><div className="flex min-w-0 items-start justify-between gap-3 border-b border-[#e5e3da] px-4 py-4 sm:px-6"><div className="min-w-0"><h2 className="text-lg font-bold">Active orders</h2><p className="text-sm text-[#657269]">What needs your attention</p></div><button onClick={onSeeOrders} className="min-h-11 shrink-0 px-2 text-sm font-bold text-[#1d6b3a]">See all →</button></div>{loading ? <OrderSkeleton /> : attention.length ? <div className="divide-y divide-[#ebe8df]">{attention.slice(0, 5).map((order) => <AttentionRow key={order.id} order={order} onOpen={() => onOpenOrder(order)} />)}</div> : <div className="px-4 py-12 text-center sm:px-6 sm:py-14"><PackageCheck className="mx-auto h-10 w-10 text-[#247044]" /><h3 className="mt-4 text-lg font-bold">Your orders will appear here</h3><p className="mx-auto mt-2 max-w-sm text-sm text-[#657269]">Take a photo and record your first customer order.</p><button onClick={onAdd} className="primary mx-auto mt-5">Add first order</button></div>}</div>
      <div className="flex min-h-[320px] min-w-0 flex-col rounded-[22px] bg-[#143f29] p-6 text-white shadow-[0_18px_50px_rgba(20,63,41,.14)] sm:p-7"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Gem /></span><div className="my-auto py-8"><h2 className="text-2xl font-bold leading-tight">Photo first.<br />Profit clear.</h2><p className="mt-4 max-w-sm text-sm leading-6 text-white/80">Snap the item, record the sale, then add what it costs you.</p></div><button onClick={onAdd} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#173d29] transition hover:bg-[#f5f2e9]"><Camera className="h-5 w-5" /> Record an order</button></div>
    </section>
  </>;
}

function AttentionRow({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = Boolean(order.dueDate && order.dueDate < today && !["Delivered", "Completed"].includes(order.status));
  const unpaid = ["Delivered", "Completed"].includes(order.status) && order.amountPaid < order.sellingPrice;
  const reason = overdue ? `Promised ${shortDate(order.dueDate)} — update the customer` : order.wholesalePrice == null ? "Add what the item cost you to confirm profit" : unpaid ? `${ugx(order.sellingPrice - order.amountPaid)} still to collect` : "Ready for customer collection";
  const action = overdue ? "Review promise" : order.wholesalePrice == null ? "Add cost" : unpaid ? "Record payment" : "Open order";
  return <button onClick={onOpen} className="group flex min-h-20 w-full min-w-0 items-center gap-3 px-4 py-4 text-left transition hover:bg-[#faf7ef] sm:gap-4 sm:px-6"><OrderPhoto order={order} /><div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-2"><p className="min-w-0 truncate font-bold">{order.itemName}</p><StatusStamp status={order.status} /></div><p className="mt-1 line-clamp-2 text-sm text-[#5f6d64] sm:truncate">{order.customerName} · {reason}</p></div><span className="hidden shrink-0 text-sm font-bold text-[#1d6b3a] group-hover:underline sm:block">{action} →</span></button>;
}

function OrdersView({ orders, loading, query, setQuery, filter, setFilter, onAdd, onOpen }: {
  orders: Order[]; loading: boolean; query: string; setQuery: (value: string) => void;
  filter: OrderFilter; setFilter: (value: OrderFilter) => void; onAdd: () => void; onOpen: (order: Order) => void;
}) {
  const filters: { value: OrderFilter; label: string }[] = [
    { value: "attention", label: "Needs attention" }, { value: "active", label: "Still moving" },
    { value: "ready", label: "Ready" }, { value: "unpaid", label: "Unpaid" }, { value: "all", label: "All orders" },
  ];
  return <><div className="mb-6 flex items-end justify-between gap-4"><div><p className="eyebrow">ORDER BOOK</p><h1 className="text-3xl font-bold tracking-[-.03em]">Every sale, one clear next move</h1><p className="mt-2 text-sm text-[#6f7a73]">Open an order to update sourcing, delivery or payment.</p></div><button onClick={onAdd} className="primary hidden sm:flex"><Plus /> Record order</button></div><div className="ledger-panel overflow-hidden"><div className="border-b border-[#e5e3da] p-4 sm:p-5"><label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#d8dcd4] bg-white px-4"><Search className="h-5 w-5 text-[#7f8982]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Customer, item, phone or status" className="w-full bg-transparent text-sm outline-none" /></label><div className="mt-4 flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`filter-chip ${filter === item.value ? "filter-chip-active" : ""}`}>{item.label}</button>)}</div></div>{loading ? <OrderSkeleton /> : orders.length ? <div className="divide-y divide-[#ebe8df]">{orders.map((order) => <OrderBookRow key={order.id} order={order} onOpen={() => onOpen(order)} />)}</div> : <div className="px-6 py-16 text-center"><PackageCheck className="mx-auto h-10 w-10 text-[#247044]" /><h3 className="mt-4 font-bold">No orders match this view</h3><p className="mt-2 text-sm text-[#748078]">Try another filter or record the next customer order.</p><button onClick={onAdd} className="secondary mt-5">Record an order</button></div>}</div></>;
}

function OrderBookRow({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const profit = orderProfit(order); const balance = Math.max(0, order.sellingPrice - order.amountPaid);
  return <button onClick={onOpen} className="grid min-h-24 w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-4 text-left transition hover:bg-[#faf7ef] sm:px-6"><OrderPhoto order={order} large /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-bold">{order.itemName}</p><StatusStamp status={order.status} /></div><p className="mt-1 truncate text-sm text-[#748078]">{order.customerName}{order.customerPhone ? ` · ${order.customerPhone}` : ""}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#68746c]"><span>{order.dueDate ? `Promised ${shortDate(order.dueDate)}` : "No promise date"}</span><span>{balance ? `${ugx(balance)} owed` : "Payment settled"}</span></div></div><div className="hidden text-right sm:block"><p className="font-bold tabular-nums">{ugx(order.sellingPrice)}</p><p className={`mt-1 text-xs font-semibold ${profit == null ? "text-[#98600b]" : profit >= 0 ? "text-[#247044]" : "text-[#a43c32]"}`}>{profit == null ? "Profit waiting on cost" : `${ugx(profit)} profit`}</p></div></button>;
}

function MoneyView({ monthLabel, sales, profit, expenses, expenseTotal, outstanding, missingCosts, onPreviousMonth, onNextMonth, canGoForward, onAddExpense }: {
  monthLabel: string; sales: number; profit: number; expenses: Expense[]; expenseTotal: number;
  outstanding: number; missingCosts: number; onPreviousMonth: () => void; onNextMonth: () => void;
  canGoForward: boolean; onAddExpense: () => void;
}) {
  return <><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">MONEY BOOK</p><h1 className="text-3xl font-bold tracking-[-.03em]">What came in, what went out</h1><p className="mt-2 text-sm text-[#6f7a73]">Profit remains provisional until every wholesale cost is recorded.</p></div><MonthPicker label={monthLabel} previous={onPreviousMonth} next={onNextMonth} canGoForward={canGoForward} /></div><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Completed sales" value={ugx(sales)} note="Delivered and completed orders" icon={<WalletCards />} /><Metric label="Confirmed profit" value={ugx(profit)} note={missingCosts ? `${missingCosts} costs still missing` : "All costs included"} tone={profit >= 0 ? "good" : "danger"} icon={<CircleDollarSign />} /><Metric label="Business costs" value={ugx(expenseTotal)} note="Not tied to individual orders" icon={<ReceiptText />} /><Metric label="Customer money due" value={ugx(outstanding)} note="Still to be collected" tone={outstanding ? "warning" : "good"} icon={<Banknote />} /></section><section className="ledger-panel mt-6"><div className="flex items-center justify-between border-b border-[#e5e3da] px-5 py-4 sm:px-6"><div><h2 className="text-lg font-bold">Business costs</h2><p className="text-sm text-[#748078]">Transport, packaging, advertising and other overhead</p></div><button onClick={onAddExpense} className="secondary"><Plus /> <span className="hidden sm:inline">Record cost</span></button></div>{expenses.length ? <div className="divide-y divide-[#ebe8df]">{expenses.map((expense) => <div key={expense.id} className="flex min-h-16 items-center gap-4 px-5 py-4 sm:px-6"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2ebdc] text-[#8b681d]"><ReceiptText className="h-5 w-5" /></span><div className="flex-1"><p className="font-bold">{expense.title}</p><p className="text-xs text-[#7b857e]">{shortDate(expense.expenseDate)}</p></div><p className="font-bold tabular-nums">{ugx(expense.amount)}</p></div>)}</div> : <div className="px-6 py-14 text-center"><p className="font-bold">No business costs recorded for {monthLabel}.</p><button onClick={onAddExpense} className="secondary mt-4">Record the first cost</button></div>}</section></>;
}

function OrderDetail({ order, close, update }: { order: Order; close: () => void; update: (order: Order, changes: Partial<Order>, options?: { offerUndo?: boolean }) => Promise<void> }) {
  const [costInput, setCostInput] = useState(order.wholesalePrice?.toString() ?? "");
  const profit = orderProfit(order); const balance = Math.max(0, order.sellingPrice - order.amountPaid);
  const next = nextStatus(order.status); const currentIndex = statuses.indexOf(order.status);
  return <div className="fixed inset-0 z-50 flex justify-end bg-[#17231c]/35" role="dialog" aria-modal="true" aria-label={`${order.itemName} order details`}><button className="absolute inset-0 cursor-default" onClick={close} aria-label="Close order details" /><section className="relative h-full w-full max-w-xl overflow-y-auto bg-[#fffdf8] shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e4e2d9] bg-[#fffdf8]/95 px-5 py-4 backdrop-blur"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#7d827d]">Order #{order.id}</p><h2 className="text-xl font-bold">{order.itemName}</h2></div><button onClick={close} className="icon-button" aria-label="Close"><X /></button></header><div className="p-5 sm:p-7"><div className="flex gap-4"><OrderPhoto order={order} hero /><div className="min-w-0"><StatusStamp status={order.status} /><p className="mt-3 text-lg font-bold">{order.customerName}</p><p className="text-sm text-[#748078]">{order.customerPhone || "No phone number recorded"}</p><p className="mt-2 text-sm text-[#526158]">{order.dueDate ? `Promised for ${shortDate(order.dueDate)}` : "No delivery promise set"}</p></div></div><div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#dedfd7] bg-[#dedfd7] sm:grid-cols-4"><DetailMoney label="Sold for" value={ugx(order.sellingPrice)} /><DetailMoney label="Item cost" value={order.wholesalePrice == null ? "Missing" : ugx(order.wholesalePrice)} warning={order.wholesalePrice == null} /><DetailMoney label="Profit" value={profit == null ? "Not confirmed" : ugx(profit)} warning={profit == null} good={profit != null && profit >= 0} /><DetailMoney label="Balance" value={ugx(balance)} warning={balance > 0} /></div>{order.wholesalePrice == null && <div className="mt-5 rounded-2xl border border-[#e8cf9a] bg-[#fff6df] p-4 text-sm text-[#704907]"><div className="flex gap-3"><AlertTriangle className="h-5 w-5 shrink-0" /><div><p className="font-bold">Profit is not confirmed</p><p className="mt-1">Add what the item cost before completing this order.</p></div></div><div className="mt-4 flex gap-2"><div className="money-input flex-1"><span>UGX</span><input aria-label="Wholesale cost" min="0" inputMode="numeric" type="number" value={costInput} onChange={(event) => setCostInput(event.target.value)} /></div><button disabled={!costInput} onClick={() => void update(order, { wholesalePrice: Number(costInput) }, { offerUndo: true })} className="primary">Save cost</button></div></div>}<section className="mt-7"><h3 className="font-bold">Order journey</h3><div className="mt-4 space-y-1">{statuses.map((status, index) => <div key={status} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${index === currentIndex ? "bg-[#e7f0e7] font-bold text-[#195d33]" : index < currentIndex ? "text-[#557063]" : "text-[#9aa19c]"}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full border ${index <= currentIndex ? "border-[#2c7449] bg-[#2c7449] text-white" : "border-[#cfd4ce]"}`}>{index < currentIndex ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>{status}</div>)}</div></section>{order.notes && <section className="mt-7 rounded-2xl border border-[#e1e2da] p-4"><p className="text-xs font-bold uppercase tracking-[.1em] text-[#7b827c]">Customer request</p><p className="mt-2 text-sm leading-6">{order.notes}</p></section>}</div><footer className="sticky bottom-0 border-t border-[#e1e2da] bg-[#fffdf8]/95 p-4 backdrop-blur sm:p-5"><div className="flex flex-col gap-2 sm:flex-row">{balance > 0 && <button onClick={() => void update(order, { amountPaid: order.sellingPrice }, { offerUndo: true })} className="secondary flex-1 justify-center"><Banknote /> Record full payment</button>}{next && <button onClick={() => void update(order, { status: next }, { offerUndo: true })} className="primary flex-1 justify-center"><ArrowRight /> {next === "Sourcing item" ? "Start sourcing" : next === "Item purchased" ? "Mark item secured" : next === "Ready" ? "Mark ready" : next === "Delivered" ? "Record delivery" : "Complete order"}</button>}</div></footer></section></div>;
}

function OrderFlow({ step, form, field, preview, choose, profit, sale, back, next, close, discard, submit, saving, error }: {
  step: number; form: typeof blank; field: (name: keyof typeof blank, value: string) => void;
  preview: string; choose: (file?: File) => void; profit: number | null; sale: number;
  back: () => void; next: () => void; close: () => void; discard: () => void;
  submit: (event: React.FormEvent) => void; saving: boolean; error: string;
}) {
  return <div className="modal" role="dialog" aria-modal="true" aria-label="Record an order"><form onSubmit={submit} className="modal-sheet max-w-3xl"><div className="modal-head"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#7a827c]">Step {step} of 3</p><h2 className="text-xl font-bold">{step === 1 ? "Capture the sale" : step === 2 ? "Protect the profit" : "Promise and payment"}</h2></div><button type="button" onClick={close} className="icon-button" aria-label="Save draft and close"><X /></button></div><div className="flex gap-1 px-5 pt-5 sm:px-7">{[1, 2, 3].map((value) => <span key={value} className={`h-1.5 flex-1 rounded-full ${value <= step ? "bg-[#1d6b3a]" : "bg-[#dfe3dc]"}`} />)}</div><div className="p-5 sm:p-7">{step === 1 && <div className="grid gap-6 md:grid-cols-[.85fr_1.15fr]"><label className="flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#cbd4ca] bg-[#f1f4ed] text-center">{preview ? <Image src={preview} alt="Selected item" width={512} height={512} unoptimized className="h-full w-full object-cover" /> : <><Camera className="text-[#2a7047]" /><b className="mt-3 text-sm">Take the item photo</b><span className="mt-1 px-4 text-xs text-[#778078]">Useful when sourcing and handing over</span></>}<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => choose(event.target.files?.[0])} /></label><div className="space-y-4"><Field label="What is the item?"><input required autoFocus placeholder="Gold name necklace" value={form.itemName} onChange={(event) => field("itemName", event.target.value)} /></Field><div><p className="mb-2 text-xs font-bold text-[#657269]">Item type</p><div className="grid grid-cols-3 gap-2">{["Jewelry", "Customized jewelry", "Watch"].map((category) => <button type="button" key={category} onClick={() => field("category", category)} className={`choice-button ${form.category === category ? "choice-button-active" : ""}`}>{category}</button>)}</div></div><Field label="Selling price"><div className="money-input"><span>UGX</span><input required min="1" inputMode="numeric" type="number" value={form.sellingPrice} onChange={(event) => field("sellingPrice", event.target.value)} /></div></Field><p className="text-xs leading-5 text-[#748078]">This saves as a draft on this device while you finish the order.</p></div></div>}{step === 2 && <div className="grid gap-6 md:grid-cols-[1.15fr_.85fr]"><div className="space-y-4"><Field label="What did the item cost you?"><div className="money-input"><span>UGX</span><input min="0" inputMode="numeric" type="number" placeholder="Leave empty if not known" value={form.wholesalePrice} onChange={(event) => field("wholesalePrice", event.target.value)} /></div></Field><Field label="Delivery, packaging and other costs"><div className="money-input"><span>UGX</span><input min="0" inputMode="numeric" type="number" value={form.extraCosts} onChange={(event) => field("extraCosts", event.target.value)} /></div></Field>{form.wholesalePrice === "" && <div className="rounded-2xl border border-[#e8cf9a] bg-[#fff6df] p-4 text-sm text-[#704907]"><p className="font-bold">Cost not known yet</p><p className="mt-1">You can continue, but ProfitLens will mark the profit as unconfirmed.</p></div>}</div><div className="profit-lens"><Sparkles className="h-5 w-5" /><p className="mt-8 text-xs font-bold uppercase tracking-[.12em] text-white/60">Profit if sold at this price</p><p className="mt-2 text-3xl font-bold tabular-nums">{profit == null ? "Waiting on cost" : ugx(profit)}</p>{profit != null && sale > 0 && <p className="mt-2 text-sm text-white/65">{Math.round((profit / sale) * 100)}% margin after item costs</p>}</div></div>}{step === 3 && <div className="grid gap-4 sm:grid-cols-2"><Field label="Customer name"><input required placeholder="Who placed the order?" value={form.customerName} onChange={(event) => field("customerName", event.target.value)} /></Field><Field label="Phone number"><input inputMode="tel" placeholder="Optional" value={form.customerPhone} onChange={(event) => field("customerPhone", event.target.value)} /></Field><Field label="Customer has paid"><div className="money-input"><span>UGX</span><input min="0" max={form.sellingPrice || undefined} inputMode="numeric" type="number" value={form.amountPaid} onChange={(event) => field("amountPaid", event.target.value)} /></div></Field><Field label="Payment method"><select value={form.paymentMethod} onChange={(event) => field("paymentMethod", event.target.value)}>{["Cash", "Mobile Money", "Bank transfer", "Not paid"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Promised delivery date"><input type="date" value={form.dueDate} onChange={(event) => field("dueDate", event.target.value)} /></Field><Field label="Starting stage"><select value={form.status} onChange={(event) => field("status", event.target.value)}>{statuses.slice(0, 4).map((value) => <option key={value}>{value}</option>)}</select></Field><div className="sm:col-span-2"><Field label="Size, colour, engraving or customer request"><textarea rows={3} placeholder="Only details needed to fulfil the order" value={form.notes} onChange={(event) => field("notes", event.target.value)} /></Field></div></div>}{error && <p className="mt-5 rounded-xl border border-[#efc8c2] bg-[#fff1ef] px-4 py-3 text-sm text-[#8b2c20]">{error}</p>}</div><div className="modal-actions"><button type="button" onClick={discard} className="mr-auto text-sm font-semibold text-[#8f4036]">Discard draft</button>{step > 1 && <button type="button" onClick={back} className="secondary"><ArrowLeft /> Back</button>}{step < 3 ? <button type="button" onClick={next} className="primary">Continue <ArrowRight /></button> : <button disabled={saving} className="primary">{saving ? <Loader2 className="animate-spin" /> : <Check />} {saving ? "Recording…" : "Record this order"}</button>}</div></form></div>;
}

function ExpenseModal({ form, setForm, close, submit, saving }: { form: { title: string; amount: string; expenseDate: string }; setForm: React.Dispatch<React.SetStateAction<{ title: string; amount: string; expenseDate: string }>>; close: () => void; submit: (event: React.FormEvent) => void; saving: boolean }) {
  const suggestions = ["Transport", "Packaging", "Advertising", "Airtime"];
  return <div className="modal" role="dialog" aria-modal="true" aria-label="Record a business cost"><form onSubmit={submit} className="modal-sheet max-w-md p-6"><div className="mb-6 flex justify-between"><div><p className="eyebrow">MONEY OUT</p><h2 className="text-xl font-bold">Record a business cost</h2><p className="mt-1 text-sm text-[#748078]">For costs not already attached to an order.</p></div><button type="button" onClick={close} className="icon-button" aria-label="Close"><X /></button></div><div className="mb-4 flex flex-wrap gap-2">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => setForm((current) => ({ ...current, title: suggestion }))} className="filter-chip">{suggestion}</button>)}</div><div className="space-y-4"><Field label="What was the cost?"><input required placeholder="Transport to supplier" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></Field><Field label="Amount"><div className="money-input"><span>UGX</span><input required min="1" inputMode="numeric" type="number" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} /></div></Field><Field label="Date"><input type="date" value={form.expenseDate} onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))} /></Field></div><button disabled={saving} className="primary mt-6 w-full justify-center">{saving && <Loader2 className="animate-spin" />} Record this cost</button></form></div>;
}

function Brand({ small = false }: { small?: boolean }) { return <div className="flex min-w-0 items-center gap-3"><span className={`${small ? "h-9 w-9" : "h-11 w-11"} flex shrink-0 items-center justify-center rounded-[14px] bg-[#173d29] text-[#f5d88c]`}><Gem /></span><div className="min-w-0"><p className="truncate font-bold tracking-[-.02em]">ProfitLens</p>{!small && <p className="text-[10px] font-semibold tracking-[.12em] text-[#7b827c]">ORDER &amp; PROFIT TRACKER</p>}</div></div>; }
function NavItem({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count?: number; onClick: () => void }) { return <button onClick={onClick} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold ${active ? "bg-[#e8efe6] text-[#195d33]" : "text-[#5f6e65] hover:bg-[#f5f2ea]"}`}><span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>{label}{count ? <span className="ml-auto rounded-full bg-[#fff7df] px-2 py-0.5 text-xs text-[#875d0c]">{count}</span> : null}</button>; }
function MobileNav({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) { return <button onClick={onClick} className={`flex min-h-12 flex-col items-center justify-center gap-1 text-xs font-semibold ${active ? "text-[#1d6b3a]" : "text-[#7b857e]"} [&>svg]:h-5 [&>svg]:w-5`}>{icon}{label}</button>; }
function MonthPicker({ label, previous, next, canGoForward }: { label: string; previous: () => void; next: () => void; canGoForward: boolean }) { return <div className="flex w-full max-w-xs items-center rounded-xl border border-[#d7dbd3] bg-[#fffdf8] p-1 sm:w-auto"><button onClick={previous} className="icon-button shrink-0" aria-label="Previous month"><ChevronLeft /></button><span className="min-w-0 flex-1 px-2 text-center text-sm font-bold sm:min-w-36">{label}</span><button onClick={next} disabled={!canGoForward} className="icon-button shrink-0 disabled:opacity-30" aria-label="Next month"><ChevronRight /></button></div>; }
function Metric({ label, value, note, icon, tone = "neutral" }: { label: string; value: string; note: string; icon: React.ReactNode; tone?: "neutral" | "good" | "warning" | "danger" }) { const color = tone === "good" ? "text-[#247044]" : tone === "warning" ? "text-[#93600c]" : tone === "danger" ? "text-[#a43c32]" : "text-[#203028]"; return <div className="metric-card"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-[#69756d]">{label}</p><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef1e9] text-[#315f43] [&>svg]:h-4.5 [&>svg]:w-4.5">{icon}</span></div><p className={`mt-4 text-2xl font-bold tracking-[-.03em] tabular-nums ${color}`}>{value}</p><p className="mt-2 text-xs leading-5 text-[#7a837d]">{note}</p></div>; }
function StatusStamp({ status }: { status: string }) { const style = status === "Completed" ? "status-complete" : status === "Delivered" ? "status-delivered" : status === "Ready" ? "status-ready" : status === "Item purchased" ? "status-secured" : status === "Sourcing item" ? "status-sourcing" : ["Cancelled", "Refunded"].includes(status) ? "status-danger" : "status-new"; return <span className={`status-stamp ${style}`}>{status}</span>; }
function OrderPhoto({ order, large = false, hero = false }: { order: Order; large?: boolean; hero?: boolean }) { const size = hero ? 112 : large ? 64 : 52; return <div style={{ width: size, height: size }} className="shrink-0 overflow-hidden rounded-2xl bg-[#e8ece4]">{order.photoKey ? <Image src={`/api/uploads/${order.photoKey}`} alt={order.itemName} width={size} height={size} unoptimized className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#849188]"><Gem /></div>}</div>; }
function DetailMoney({ label, value, warning, good }: { label: string; value: string; warning?: boolean; good?: boolean }) { return <div className="bg-[#fffdf8] p-3"><p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#858c86]">{label}</p><p className={`mt-1 text-sm font-bold tabular-nums ${warning ? "text-[#93600c]" : good ? "text-[#247044]" : ""}`}>{value}</p></div>; }
function SyncIndicator({ state, compact = false }: { state: SyncState; compact?: boolean }) { const content = state === "saving" ? { icon: <Loader2 className="animate-spin" />, label: "Saving…" } : state === "offline" ? { icon: <WifiOff />, label: "Offline draft" } : { icon: <CheckCircle2 />, label: "Saved" }; return <div className={`flex items-center gap-2 text-xs font-semibold ${state === "offline" ? "text-[#9b4a3e]" : "text-[#5f7667]"} [&>svg]:h-4 [&>svg]:w-4`}>{content.icon}{!compact && content.label}</div>; }
function Toast({ message, actionLabel, action, close }: { message: string; actionLabel?: string; action?: () => void; close: () => void }) { return <div role="status" className="fixed bottom-24 left-1/2 z-[70] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-2 rounded-2xl bg-[#173d29] px-3 py-3 text-sm text-white shadow-2xl sm:gap-3 sm:px-4 lg:bottom-6"><CheckCircle2 className="h-5 w-5 shrink-0 text-[#b8e4c5]" /><p className="min-w-0 flex-1">{message}</p>{actionLabel && action && <button onClick={() => { action(); close(); }} className="min-h-11 shrink-0 px-1 font-bold text-[#f5d88c]">{actionLabel}</button>}<button onClick={close} aria-label="Dismiss" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/75 hover:bg-white/10"><X className="h-4 w-4" /></button></div>; }
function ErrorBanner({ message, retry, close }: { message: string; retry: () => void; close: () => void }) { return <div role="alert" className="mb-5 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 rounded-2xl border border-[#e6bbb4] bg-[#fff0ed] px-4 py-3 text-sm text-[#85352b]"><AlertTriangle className="mt-1 h-5 w-5 shrink-0" /><p className="min-w-0 break-words leading-6">{message}</p><button onClick={close} aria-label="Dismiss" className="icon-button -mr-2 -mt-2 text-[#85352b]"><X className="h-4 w-4" /></button><button onClick={retry} className="col-start-2 flex min-h-11 w-fit items-center gap-1 font-bold"><RefreshCw className="h-4 w-4" /> Retry</button></div>; }
function OrderSkeleton() { return <div className="divide-y divide-[#ebe8df]">{[1, 2, 3].map((value) => <div key={value} className="flex h-24 items-center gap-4 px-6"><div className="h-13 w-13 animate-pulse rounded-2xl bg-[#ecece5]" /><div className="flex-1"><div className="h-4 w-1/3 animate-pulse rounded bg-[#ecece5]" /><div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-[#f0f0eb]" /></div></div>)}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-[#657269]">{label}</span><div className="form-control">{children}</div></label>; }
