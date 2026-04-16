<template>
  <header>
    <div class="header-left">
      <div class="logo">PORT<span>FOLIO</span></div>
      <div class="summary-pills">
        <span class="pill"><b>{{ activePositions.length }}</b> positions</span>
        <span class="pill" :class="totalPnl >= 0 ? 'green' : 'red'">P&amp;L <b>{{ fmt(totalPnl, 2, true) }}</b></span>
      </div>
    </div>
    <div class="header-right">
      <span class="last-refresh">{{ lastRefresh || '–' }}</span>
      <span v-if="refreshing" class="spinner"></span>
      <select v-model.number="intervalMs" class="btn" @change="scheduleNext">
        <option :value="0">off</option>
        <option :value="15000">15 s</option>
        <option :value="30000">30 s</option>
        <option :value="60000">1 min</option>
      </select>
      <button class="btn" @click="doRefresh">↺ Refresh</button>
      <button class="btn accent" @click="openModal()">+ Position</button>
    </div>
  </header>

  <div class="tabs">
    <button class="tab" :class="{active: currentView === 'list'}" @click="currentView = 'list'">List</button>
    <button class="tab" :class="{active: currentView === 'charts'}" @click="currentView = 'charts'">Charts</button>
    <button class="tab" :class="{active: currentView === 'archive'}" @click="currentView = 'archive'">Archive</button>
  </div>

  <main v-if="currentView === 'list'" class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Name</th><th>Exch.</th><th>Buy</th><th>Want</th><th>Current</th><th>Today</th><th>%P&amp;L</th><th>Value</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in activePositions" :key="p.id">
          <td><a class="name-link" :href="`https://www.tradegate.de/orderbuch.php?isin=${p.isin}`" target="_blank">{{ p.name }}</a></td>
          <td>{{ p.exchange }}</td>
          <td>{{ fmt(p.rate) }}</td>
          <td>{{ p.want ? fmt(p.want) : '–' }}</td>
          <td>{{ quote(p.isin)?.bid ? fmt(quote(p.isin)?.bid || 0) : '–' }}</td>
          <td :class="colorClass(quote(p.isin)?.change)">{{ fmtPct(quote(p.isin)?.change) }}</td>
          <td :class="colorClass(getProfit(p))">{{ fmtPct(getProfit(p)) }}</td>
          <td :class="colorClass(getPnlEur(p))">{{ fmt(getPnlEur(p), 2, true) }}</td>
          <td>
            <button class="icon-btn" @click="openModal(p)">✎</button>
            <button class="icon-btn" @click="deletePosition(p.id)">✕</button>
          </td>
        </tr>
      </tbody>
    </table>
  </main>

  <main v-else-if="currentView === 'charts'" class="chart-grid">
    <div class="chart-card" v-for="p in activePositions" :key="p.id">
      <div class="chart-card-header">
        <span class="chart-card-name">{{ p.name }}</span>
        <span>{{ quote(p.isin)?.bid ? fmt(quote(p.isin)?.bid || 0) : '–' }}</span>
      </div>
      <img :src="`https://www.tradegate.de/images/charts/monat/${p.isin}.png?${now}`" alt="chart" />
    </div>
  </main>

  <main v-else class="table-wrap">
    <table>
      <thead><tr><th>Name</th><th>Exchange</th><th>Buy</th><th>Last Bid</th></tr></thead>
      <tbody>
        <tr v-for="p in archivedPositions" :key="p.id" class="sold">
          <td>{{ p.name }}</td><td>{{ p.exchange }}</td><td>{{ fmt(p.rate) }}</td><td>{{ quote(p.isin)?.bid ? fmt(quote(p.isin)?.bid || 0) : '–' }}</td>
        </tr>
      </tbody>
    </table>
  </main>

  <div class="modal-backdrop" :class="{open: isModalOpen}" @click.self="closeModal">
    <div class="modal">
      <h2>{{ editingId ? 'Edit Position' : 'Add Position' }}</h2>
      <div class="form-grid">
        <div class="field form-full"><label>Name</label><input v-model="form.name" /></div>
        <div class="field form-full"><label>URL</label><input v-model="form.url" /></div>
        <div class="field"><label>ISIN</label><input v-model="form.isin" /></div>
        <div class="field"><label>Exchange</label><input v-model="form.exchange" /></div>
        <div class="field"><label>Amount</label><input v-model.number="form.amount" type="number" /></div>
        <div class="field"><label>Buy Rate</label><input v-model.number="form.rate" type="number" /></div>
        <div class="field form-full"><label>Want</label><input v-model.number="form.want" type="number" /></div>
      </div>
      <div class="form-row">
        <button class="btn" @click="closeModal">Cancel</button>
        <button class="btn accent" @click="savePosition">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

type Position = { id: string; name: string; url: string; isin: string; exchange: string; amount: number; rate: number; want: number | null; sold: boolean; hide: boolean };
type Quote = { isin: string; bid: number | null; change: number | null };

const STORAGE_KEY = 'portfolio_v2';
const positions = ref<Position[]>(loadPositions());
const quoteMap = ref<Record<string, Quote>>({});
const intervalMs = ref(0);
const intervalId = ref<number>();
const refreshing = ref(false);
const currentView = ref<'list'|'charts'|'archive'>('list');
const lastRefresh = ref('');
const now = ref(Date.now());

const isModalOpen = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({ name: '', url: '', isin: '', exchange: '', amount: 0, rate: 0, want: null as number | null, sold: false, hide: false });

const activePositions = computed(() => positions.value.filter((p) => !p.sold && !p.hide));
const archivedPositions = computed(() => positions.value.filter((p) => p.sold));
const totalPnl = computed(() => activePositions.value.reduce((sum, p) => sum + (getPnlEur(p) || 0), 0));

function quote(isin: string) { return quoteMap.value[isin]; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function loadPositions(): Position[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  return [{ id: uid(), name: 'SAP', url: 'sap.com', isin: 'DE0007164600', exchange: 'SC', amount: 21, rate: 232, want: null, sold: false, hide: false }];
}

function savePositions() { localStorage.setItem(STORAGE_KEY, JSON.stringify(positions.value)); }

function fmt(value: number | null | undefined, digits = 2, currency = false): string {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) return '–';
  return value.toLocaleString('de-DE', currency
    ? { style: 'currency', currency: 'EUR', maximumFractionDigits: digits, minimumFractionDigits: digits }
    : { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)} %`;
}

function colorClass(value: number | null | undefined): string {
  if (!value) return 'neu';
  return value > 0 ? 'pos' : 'neg';
}

function getProfit(p: Position): number | null {
  const bid = quote(p.isin)?.bid;
  if (!bid || !p.rate) return null;
  return ((bid / p.rate) - 1) * 100;
}

function getPnlEur(p: Position): number | null {
  const bid = quote(p.isin)?.bid;
  if (!bid || !p.rate || !p.amount) return null;
  return p.amount * (bid - p.rate);
}

async function doRefresh(): Promise<void> {
  refreshing.value = true;
  try {
    const isins = [...new Set(positions.value.filter((p) => !p.hide).map((p) => p.isin))];
    const url = `/api/quotes?isins=${encodeURIComponent(isins.join(','))}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json() as { quotes: Record<string, Quote> };
    quoteMap.value = data.quotes || {};
    lastRefresh.value = new Date().toLocaleTimeString('de-DE');
    now.value = Date.now();
  } finally {
    refreshing.value = false;
    scheduleNext();
  }
}

function scheduleNext(): void {
  if (intervalId.value) clearTimeout(intervalId.value);
  if (intervalMs.value > 0) intervalId.value = window.setTimeout(() => void doRefresh(), intervalMs.value);
}

function openModal(position?: Position): void {
  isModalOpen.value = true;
  if (!position) {
    editingId.value = null;
    Object.assign(form, { name: '', url: '', isin: '', exchange: '', amount: 0, rate: 0, want: null, sold: false, hide: false });
    return;
  }
  editingId.value = position.id;
  Object.assign(form, position);
}

function closeModal(): void { isModalOpen.value = false; }

function savePosition(): void {
  if (!form.name.trim() || !form.isin.trim()) return;
  const payload: Position = { id: editingId.value ?? uid(), name: form.name.trim(), url: form.url.trim(), isin: form.isin.trim().toUpperCase(), exchange: form.exchange.trim(), amount: Number(form.amount) || 0, rate: Number(form.rate) || 0, want: form.want ? Number(form.want) : null, sold: form.sold, hide: form.hide };
  if (editingId.value) {
    const idx = positions.value.findIndex((p) => p.id === editingId.value);
    if (idx >= 0) positions.value[idx] = payload;
  } else {
    positions.value.push(payload);
  }
  savePositions();
  closeModal();
  void doRefresh();
}

function deletePosition(id: string): void {
  positions.value = positions.value.filter((p) => p.id !== id);
  savePositions();
}

onMounted(() => { void doRefresh(); });
</script>

<style>
:root { --bg:#0a0a0f;--surface:#111118;--border:#1e1e2e;--border2:#2a2a3e;--text:#c8c8d8;--muted:#555570;--accent:#4fc3f7;--green:#4cff8f;--red:#ff4c6a; }
*{box-sizing:border-box;margin:0;padding:0} body{background:var(--bg);color:var(--text);font-family:'IBM Plex Mono',monospace;font-size:13px}
header{display:flex;justify-content:space-between;padding:14px 24px;border-bottom:1px solid var(--border2);background:var(--surface)}
.header-left,.header-right{display:flex;align-items:center;gap:12px}.logo{font-size:15px;font-weight:600;letter-spacing:.12em;color:var(--accent)}.logo span{color:var(--muted)}
.btn{font-family:inherit;font-size:11px;padding:5px 12px;border:1px solid var(--border2);background:var(--surface);color:var(--text);cursor:pointer}.btn.accent{border-color:var(--accent);color:var(--accent)}
.tabs{display:flex;border-bottom:1px solid var(--border2);padding:0 24px;background:var(--surface)}.tab{font-size:11px;padding:8px 16px;border:none;background:none;color:var(--muted);cursor:pointer}.tab.active{color:var(--accent);border-bottom:2px solid var(--accent)}
.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse}th,td{padding:7px 14px;border-bottom:1px solid var(--border);text-align:right}th:first-child,td:first-child{text-align:left}
.name-link{color:var(--accent);text-decoration:none}.pos{color:var(--green)}.neg{color:var(--red)}
.modal-backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);align-items:center;justify-content:center}.modal-backdrop.open{display:flex}
.modal{background:var(--surface);border:1px solid var(--border2);padding:24px;width:520px;max-width:95vw}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.form-full{grid-column:1/-1}
.field label{display:block;font-size:10px;color:var(--muted);margin-bottom:4px}.field input{width:100%;background:var(--bg);border:1px solid var(--border2);color:var(--text);padding:7px 10px}
.form-row{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}.chart-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;padding:16px 24px}.chart-card{border:1px solid var(--border2);background:var(--surface)}.chart-card-header{display:flex;justify-content:space-between;padding:8px 12px}
.pill{font-size:11px;padding:3px 10px;border:1px solid var(--border2)}.pill.green b{color:var(--green)}.pill.red b{color:var(--red)}
.spinner{display:inline-block;width:10px;height:10px;border:2px solid var(--border2);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
</style>
