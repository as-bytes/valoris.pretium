<template>
  <header>
    <div class="header-left">
      <div class="logo">Valoris<span>Pretium</span></div>
      <div class="summary-pills">
        <span class="pill"
          ><b>{{ activePositions.length }}</b> positions</span
        >
        <span class="pill" :class="totalPnl >= 0 ? 'green' : 'red'"
          >P&amp;L <b>{{ fmt(totalPnl, 2, true) }}</b></span
        >
      </div>
    </div>
    <div class="header-right">
      <span class="last-refresh">{{ lastRefresh || "–" }}</span>
      <span v-if="refreshing" class="spinner"></span>
      <select v-model.number="intervalMs" class="btn" @change="scheduleNext()">
        <option :value="0">off</option>
        <option :value="15000">15 s</option>
        <option :value="30000">30 s</option>
        <option :value="60000">1 min</option>
      </select>
      <button class="btn" @click="doRefreshAll">↺ Refresh</button>
      <button
        class="btn"
        @click="downloadConfig(positions, lastRefresh, quoteMap)"
      >
        ↓ Config
      </button>
      <button class="btn" @click="showImportDialog = true">↑ Config</button>
      <button class="btn accent" @click="openModal()">+ Position</button>
    </div>
  </header>

  <div class="tabs">
    <button
      class="tab"
      :class="{ active: currentView === 'list' }"
      @click="currentView = 'list'"
    >
      List
    </button>
    <button
      class="tab"
      :class="{ active: currentView === 'charts' }"
      @click="currentView = 'charts'"
    >
      Charts
    </button>
    <button
      class="tab"
      :class="{ active: currentView === 'archive' }"
      @click="currentView = 'archive'"
    >
      Archive
    </button>
  </div>

  <main v-if="currentView === 'list'" class="table-wrap">
    <table>
      <thead>
        <tr>
          <th @click="sortBy('name')" style="cursor: pointer;">Name ↕</th>
          <th class="wide-only">Exch.</th>
          <th class="wide-only">Buy-In</th>
          <th class="wide-only">Want</th>
          <th>Current</th>
          <th @click="sortBy('today')" style="cursor: pointer;">Today ↕</th>
          <th @click="sortBy('pnl')" style="cursor: pointer;">%P&amp;L ↕</th>
          <th class="wide-only" @click="sortBy('invested')" style="cursor: pointer;">Invested ↕</th>
          <th @click="sortBy('value')" style="cursor: pointer;">Value ↕</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="pos in activePositions" :key="pos.id">
          <td>
            <div class="name-cell">
              <img
                v-if="pos.url"
                class="favicon"
                :src="faviconUrl(pos.url)"
                alt=""
              />
              <a
                class="name-link"
                :href="`https://www.tradegate.de/orderbuch.php?isin=${pos.isin}`"
                target="_blank"
                >{{ pos.name }}</a
              >
            </div>
          </td>
          <td class="wide-only">
            <span class="exchange-badge" v-if="pos.exchange">{{ pos.exchange }}</span>
          </td>
          <td class="wide-only">{{ fmt(pos.rate) }}</td>
          <td class="wide-only">{{ pos.want ? fmt(pos.want) : "–" }}</td>
          <td>
            {{ quote(pos.isin)?.bid ? fmt(quote(pos.isin)?.bid || 0) : "–" }}
          </td>
          <td :class="colorClass(quote(pos.isin)?.change)">
            {{ fmtPct(quote(pos.isin)?.change) }}
          </td>
          <td :class="colorClass(getProfit(pos))">
            {{ fmtPct(getProfit(pos)) }}
          </td>
          <td class="wide-only">{{ fmt(pos.amount * pos.rate, 2, true) }}</td>
          <td :class="colorClass(getPnlEur(pos))">
            {{ fmt(getPnlEur(pos), 2, true) }}
          </td>
          <td>
            <div class="row-actions">
              <button
                class="icon-btn refresh"
                @click="doRefreshSingle(pos.isin)"
              >
                ↺
              </button>
              <button class="icon-btn edit" @click="openModal(pos)">✎</button>
              <button class="icon-btn del" @click="deletePosition(pos.id)">
                ✕
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </main>

  <main v-else-if="currentView === 'charts'" class="chart-grid">
    <div class="chart-card" v-for="p in activePositions" :key="p.id">
      <div class="chart-card-header">
        <span class="chart-card-name">{{ p.name }}</span>
        <span>{{
          quote(p.isin)?.bid ? fmt(quote(p.isin)?.bid || 0) : "–"
        }}</span>
      </div>
      <img
        :src="`https://www.tradegate.de/images/charts/monat/${p.isin}.png?${now}`"
        alt="chart"
      />
    </div>
  </main>

  <main v-else class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th class="wide-only">Exchange</th>
          <th class="wide-only">Buy-In</th>
          <th>Last Bid</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="pos in archivedPositions" :key="pos.id" class="sold">
          <td>
            <div class="name-cell">
              <span>{{ pos.name }}</span>
            </div>
          </td>
          <td class="wide-only">{{ pos.exchange }}</td>
          <td class="wide-only">{{ fmt(pos.rate) }}</td>
          <td>
            {{ quote(pos.isin)?.bid ? fmt(quote(pos.isin)?.bid || 0) : "–" }}
          </td>
          <td>
            <button class="icon-btn del" @click="deletePosition(pos.id)">
              ✕
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </main>

  <div class="test-data">
    <hr size="1" />
    <button class="btn" v-if="positions.length === 0" @click="loadTestData">
      load test data
    </button>
  </div>

  <DialogAddPosition
    v-if="showAddDialog !== null"
    v-model:add-or-edit="showAddDialog"
    v-model:positions="positions"
  />

  <DialogImport v-model:show="showImportDialog" @import="handleImport" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { STORAGE_KEY, STORAGE_VERSION } from "./constants";
import DialogAddPosition from "./DialogAddPosition.vue";
import DialogImport from "./DialogImport.vue";
import { downloadConfig } from "./storage";
import { Position, Quote, StorageModel } from "./types";
import {
  faviconUrl,
  loadStorageModel,
  savePositions,
  saveStorageModel,
} from "./utils";

const storageModel = loadStorageModel();
const positions = ref<Position[]>(storageModel.positions);
const quoteMap = ref<Record<string, Quote>>(storageModel.lastQuotes || {});
const intervalMs = ref(0);
const intervalId = ref<number>();
const refreshing = ref(false);
const currentView = ref<"list" | "charts" | "archive">("list");
const lastRefresh = ref(storageModel.lastRefresh || "");
const now = ref(Date.now());

const showAddDialog = ref<string | null>(null);
const showImportDialog = ref(false);
const sortKey = ref<string | null>(null);
const sortAsc = ref(true);

const sortedPositions = computed(() => {
  const positionsToSort = [...positions.value.filter((p) => !p.sold && !p.hide)];
  if (!sortKey.value) return positionsToSort;

  return positionsToSort.sort((a, b) => {
    let valA: any, valB: any;

    if (sortKey.value === "name") {
      valA = a.name;
      valB = b.name;
    } else if (sortKey.value === "today") {
      valA = quoteMap.value[a.isin]?.change || 0;
      valB = quoteMap.value[b.isin]?.change || 0;
    } else if (sortKey.value === "pnl") {
      valA = getProfit(a) || 0;
      valB = getProfit(b) || 0;
    } else if (sortKey.value === "invested") {
      valA = a.amount * a.rate;
      valB = b.amount * b.rate;
    } else if (sortKey.value === "value") {
      valA = getPnlEur(a) || 0;
      valB = getPnlEur(b) || 0;
    } else {
      return 0;
    }

    if (valA < valB) return sortAsc.value ? -1 : 1;
    if (valA > valB) return sortAsc.value ? 1 : -1;
    return 0;
  });
});

const activePositions = computed(() => sortedPositions.value);
const archivedPositions = computed(() => positions.value.filter((p) => p.sold));
const totalPnl = computed(() =>
  positions.value
    .filter((p) => !p.sold && !p.hide)
    .reduce((sum, p) => sum + (getPnlEur(p) || 0), 0),
);

function sortBy(key: string) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortKey.value = key;
    sortAsc.value = true;
  }
}

function persistStorageModel() {
  const model: StorageModel = {
    version: STORAGE_VERSION,
    positions: positions.value,
    lastQuotes: quoteMap.value,
    lastRefresh: lastRefresh.value,
  };
  saveStorageModel(model);
}

watch(
  positions,
  () => {
    savePositions(positions.value);
  },
  { deep: true },
);

watch(
  [quoteMap, lastRefresh],
  () => {
    persistStorageModel();
  },
  { deep: true },
);

function quote(isin: string) {
  return quoteMap.value[isin];
}

function fmt(
  value: number | null | undefined,
  digits = 2,
  currency = false,
): string {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value) ||
    value === 0
  )
    return "–";
  return value.toLocaleString(
    "de-DE",
    currency
      ? {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: digits,
          minimumFractionDigits: digits,
        }
      : { maximumFractionDigits: digits, minimumFractionDigits: digits },
  );
}

function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}\u00A0%`;
}

function colorClass(value: number | null | undefined): string {
  if (!value) return "neu";
  return value > 0 ? "pos" : "neg";
}

function getProfit(p: Position): number | null {
  const bid = quote(p.isin)?.bid;
  if (!bid || !p.rate) return null;
  return (bid / p.rate - 1) * 100;
}

function getPnlEur(p: Position): number | null {
  const bid = quote(p.isin)?.bid;
  if (!bid || !p.rate || !p.amount) return null;
  return p.amount * (bid - p.rate);
}

window.addEventListener("storage", () => {
  const model = loadStorageModel();
  positions.value = model.positions;
  quoteMap.value = model.lastQuotes;
  lastRefresh.value = model.lastRefresh;
  scheduleNext();
});

function updateTitle() {
  if (totalPnl.value === 0) {
    document.title = "ValorisPretium";
  } else {
    const title =
      totalPnl.value > 0
        ? `+${fmt(totalPnl.value, 2, true)}`
        : fmt(totalPnl.value, 2, true);
    document.title = title;
  }
}

async function doRefreshAll(): Promise<void> {
  refreshing.value = true;
  try {
    const isins = [
      ...new Set(positions.value.filter((p) => !p.hide).map((p) => p.isin)),
    ];
    const url = `/api/quotes`;
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(isins),
      headers: { "content-type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = (await response.json()) as { quotes: Record<string, Quote> };
    quoteMap.value = data.quotes || {};
    lastRefresh.value = new Date().toLocaleTimeString("de-DE");
    now.value = Date.now();
  } finally {
    updateTitle();
    refreshing.value = false;
    scheduleNext();
  }
}

async function doRefreshSingle(isin: string): Promise<void> {
  refreshing.value = true;
  try {
    const url = `/api/quotes`;
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify([isin]),
      headers: { "content-type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = (await response.json()) as { quotes: Record<string, Quote> };

    quoteMap.value[isin] = data.quotes[isin];
    now.value = Date.now();
  } finally {
    updateTitle();
    refreshing.value = false;
  }
}

function scheduleNext(now = false): void {
  if (intervalId.value) {
    clearTimeout(intervalId.value);
  }

  if (intervalMs.value > 0) {
    intervalId.value = window.setTimeout(doRefreshAll, intervalMs.value);
  }

  if (now) {
    doRefreshAll();
  }
}

function openModal(position?: Position): void {
  showAddDialog.value = position ? position.id : "";
}

function deletePosition(id: string): void {
  positions.value = positions.value.filter((p) => p.id !== id);
}

function refreshQuote(id: string): void {
  positions.value = positions.value.filter((p) => p.id !== id);
}

function handleImport(payload: { positions: Position[]; additive: boolean }) {
  if (payload.additive) {
    positions.value = [...positions.value, ...payload.positions];
  } else {
    if (confirm("Importing config will delete all current local data. Continue?")) {
      positions.value = payload.positions;
    }
  }
  scheduleNext(true);
}

function loadTestData() {
  positions.value = [
    {
      isin: "DE0007164600",
      amount: 12,
      exchange: "ING",
      hide: false,
      id: "SAP",
      name: "SAP",
      rate: 159,
      sold: false,
      url: "sap.com",
      want: null,
    },
    {
      isin: "US5949181045",
      amount: 5,
      exchange: "DKB",
      hide: false,
      id: "Microsoft",
      name: "Microsoft",
      rate: 330,
      sold: false,
      url: "microsoft.com",
      want: null,
    },
    {
      isin: "DE0008232125",
      amount: 5,
      exchange: "DKB",
      hide: false,
      id: "Lufthansa",
      name: "Lufthansa ",
      rate: 7.6,
      sold: true,
      url: "lufthansa.com",
      want: null,
    },
    {
      isin: "IE00B0M62Q58",
      amount: 5,
      exchange: "ING",
      hide: true,
      id: "MSCI World",
      name: "MSCI World ",
      rate: 80.6,
      sold: true,
      url: "ishares.com",
      want: null,
    },
  ];
}

// onMounted(scheduleNext);
</script>

<style>
:root {
  --bg: #0a0a0f;
  --surface: #111118;
  --border: #1e1e2e;
  --border2: #2a2a3e;
  --text: #c8c8d8;
  --muted: #747497;
  --accent: #4ff757;
  /* --accent: #4fc3f7; */
  --green: #4cff8f;
  --red: #ff4c6a;
  --yellow: #ffd166;
  --sold-bg: #0d0d1a;
  --want-hit-red: #1a0008;
  --want-hit-green: #001a0a;
  --flash-color: #4fc3f7;

  --font-size-xxxs: 0.5rem;
  --font-size-xxs: 0.7rem;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  --font-size-xxl: 2.5rem;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: "IBM Plex Mono", monospace;
  font-size: var(--font-size-sm);
  min-height: 100vh;
}

header {
  display: flex;
  justify-content: space-between;
  padding: 14px 24px;
  border-bottom: 1px solid var(--border2);
  background: var(--surface);
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  font-size: var(--font-size-lg);
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--accent);
  text-transform: uppercase;
}

.logo span {
  color: var(--muted);
  font-weight: 300;
}

.btn {
  font-family: "IBM Plex Mono", monospace;
  font-size: var(--font-size-xs);
  padding: 5px 12px;
  border: 1px solid var(--border2);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  border-radius: 2px;
  letter-spacing: 0.05em;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  white-space: nowrap;
}

.btn.accent {
  border-color: var(--accent);
  color: var(--accent);
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--border2);
  padding: 0 24px;
  background: var(--surface);
  gap: 0;
}

.tab {
  font-size: var(--font-size-xs);
  padding: 8px 16px;
  border: none;
  background: none;
  color: var(--muted);
  cursor: pointer;
  font-family: "IBM Plex Mono", monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-bottom: 2px solid transparent;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.tab.active {
  color: var(--accent);
  border-bottom: 2px solid var(--accent);
  border-bottom-color: var(--accent);
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 7px 14px;
  border-bottom: 1px solid var(--border);
  text-align: right;
}

th:first-child,
td:first-child {
  text-align: left;
}

.name-link {
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.favicon {
  width: 14px;
  height: 14px;
  border-radius: 2px;
  object-fit: contain;
  flex-shrink: 0;
}

.exchange-badge {
  font-size: var(--font-size-xxs);
  color: var(--muted);
  letter-spacing: 0.06em;
  padding: 1px 5px;
  border: 1px solid var(--border2);
  border-radius: 2px;
}

.pos {
  color: var(--green);
}

.neg {
  color: var(--red);
}

.hidden-upload {
  display: none;
}

.modal-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal-backdrop.open {
  display: flex;
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border2);
  padding: 28px 32px;
  width: 480px;
  max-width: 95vw;
  border-radius: 4px;
  max-height: 90vh;
  overflow-y: auto;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.field input {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border2);
  color: var(--text);
  padding: 7px 10px;
}

.form-row {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
  padding: 16px 24px;
}

.chart-card {
  border: 1px solid var(--border2);
  background: var(--surface);
  border-radius: 3px;
  overflow: hidden;
}

.chart-card-header {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  align-items: center;
  border-bottom: 1px solid var(--border);
}

.pill {
  font-size: var(--font-size-xs);
  padding: 3px 10px;
  border: 1px solid var(--border2);
  border-radius: 2px;
  color: var(--muted);
  white-space: nowrap;
}

.pill b:nth-child(1) {
  color: var(--text);
}

.pill.green b {
  color: var(--green);
}

.row-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.icon-btn {
  background: none;
  border: 1px solid transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: var(--font-size-md);
  padding: 2px 5px;
  border-radius: 2px;
  transition:
    color 0.12s,
    border-color 0.12s,
    background 0.12s;
  line-height: 1;
}

.icon-btn:hover {
  color: var(--text);
  border-color: var(--border2);
  background: var(--border2);
}

.icon-btn.edit:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.icon-btn.del:hover {
  color: var(--red);
  border-color: var(--red);
}

/* Ensure action buttons in table cells are properly aligned */
td:last-child {
  text-align: right;
}

.test-data {
  text-align: center;
}
.test-data .btn {
  margin-top: 10px;
}

tr.sold > td {
  text-decoration: line-through;
}

.wide-only {
  display: none;
}

@media (min-width: 768px) {
  th.wide-only,
  td.wide-only {
    display: table-cell !important;
  }
}

tbody tr {
  transition: background-color 0.12s ease;
}

tbody tr:hover {
  background-color: var(--border);
}
</style>
