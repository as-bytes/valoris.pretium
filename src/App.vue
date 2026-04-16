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
          <th>Name</th>
          <th>Exch.</th>
          <th>Buy</th>
          <th>Want</th>
          <th>Current</th>
          <th>Today</th>
          <th>%P&amp;L</th>
          <th>Value</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="pos in activePositions" :key="pos.id">
          <td>
            <a
              class="name-link"
              :href="`https://www.tradegate.de/orderbuch.php?isin=${pos.isin}`"
              target="_blank"
              >{{ pos.name }}</a
            >
          </td>
          <td>
            <span class="exchange-badge">{{ pos.exchange }}</span>
          </td>
          <td>{{ fmt(pos.rate) }}</td>
          <td>{{ pos.want ? fmt(pos.want) : "–" }}</td>
          <td>
            {{ quote(pos.isin)?.bid ? fmt(quote(pos.isin)?.bid || 0) : "–" }}
          </td>
          <td :class="colorClass(quote(pos.isin)?.change)">
            {{ fmtPct(quote(pos.isin)?.change) }}
          </td>
          <td :class="colorClass(getProfit(pos))">
            {{ fmtPct(getProfit(pos)) }}
          </td>
          <td :class="colorClass(getPnlEur(pos))">
            {{ fmt(getPnlEur(pos), 2, true) }}
          </td>
          <td>
            <button class="icon-btn" @click="openModal(pos)">✎</button>
            <button class="icon-btn" @click="deletePosition(pos.id)">✕</button>
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
          <th>Exchange</th>
          <th>Buy</th>
          <th>Last Bid</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in archivedPositions" :key="p.id" class="sold">
          <td>{{ p.name }}</td>
          <td>{{ p.exchange }}</td>
          <td>{{ fmt(p.rate) }}</td>
          <td>{{ quote(p.isin)?.bid ? fmt(quote(p.isin)?.bid || 0) : "–" }}</td>
        </tr>
      </tbody>
    </table>
  </main>

  <DialogAddPosition
    v-if="showAddDialog !== null"
    v-model:add-or-edit="showAddDialog"
    v-model:positions="positions"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import DialogAddPosition from "./DialogAddPosition.vue";
import { Position, Quote } from "./types";
import { loadPositions, savePositions } from "./utils";

const positions = ref<Position[]>(loadPositions());
const quoteMap = ref<Record<string, Quote>>({});
const intervalMs = ref(0);
const intervalId = ref<number>();
const refreshing = ref(false);
const currentView = ref<"list" | "charts" | "archive">("list");
const lastRefresh = ref("");
const now = ref(Date.now());

const showAddDialog = ref<string | null>(null);
const activePositions = computed(() =>
  positions.value.filter((p) => !p.sold && !p.hide),
);
const archivedPositions = computed(() => positions.value.filter((p) => p.sold));
const totalPnl = computed(() =>
  activePositions.value.reduce((sum, p) => sum + (getPnlEur(p) || 0), 0),
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
  return `${value > 0 ? "+" : ""}${value.toFixed(2)} %`;
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

window.addEventListener("storage", (event) => {
  console.log(event.key, event.newValue);
  doRefresh();
});

async function doRefresh(): Promise<void> {
  refreshing.value = true;
  try {
    const isins = [
      ...new Set(positions.value.filter((p) => !p.hide).map((p) => p.isin)),
    ];
    const url = `/api/quotes?isins=${encodeURIComponent(isins.join(","))}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { quotes: Record<string, Quote> };
    quoteMap.value = data.quotes || {};
    lastRefresh.value = new Date().toLocaleTimeString("de-DE");
    now.value = Date.now();
  } finally {
    refreshing.value = false;
    scheduleNext();
  }
}

function scheduleNext(): void {
  if (intervalId.value) clearTimeout(intervalId.value);
  if (intervalMs.value > 0)
    intervalId.value = window.setTimeout(
      () => void doRefresh(),
      intervalMs.value,
    );
}

function openModal(position?: Position): void {
  showAddDialog.value = position ? position.id : "";
}

function deletePosition(id: string): void {
  positions.value = positions.value.filter((p) => p.id !== id);
  savePositions(positions.value);
}

onMounted(() => {
  void doRefresh();
});
</script>

<style>
:root {
  --bg: #0a0a0f;
  --surface: #111118;
  --border: #1e1e2e;
  --border2: #2a2a3e;
  --text: #c8c8d8;
  --muted: #555570;
  --accent: #4fc3f7;
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

.pos {
  color: var(--green);
}

.neg {
  color: var(--red);
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

.form-full {
  grid-column: 1 / -1;
}

.field label {
  display: block;
  font-size: var(--font-size-xxs);
  color: var(--muted);
  margin-bottom: 5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
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

.pill.green b {
  color: var(--green);
}

.pill.red b {
  color: var(--red);
}

.spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid var(--border2);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  vertical-align: middle;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.exchange-badge {
  font-size: 9px;
  color: var(--muted);
  letter-spacing: 0.06em;
  padding: 1px 5px;
  border: 1px solid var(--border2);
  border-radius: 2px;
}

thead th {
  font-size: var(--font-size-xxs);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 8px 14px;
  border-bottom: 1px solid var(--border2);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  text-align: right;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 18px;
}

.summary-pills {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.pill b {
  color: var(--text);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn:hover {
  background: var(--border2);
  color: #fff;
}

.btn.accent:hover {
  background: var(--accent);
  color: #000;
}

.btn.danger {
  border-color: var(--red);
  color: var(--red);
}

.btn.danger:hover {
  background: var(--red);
  color: #fff;
}

.btn.sm {
  font-size: var(--font-size-xxs);
  padding: 3px 8px;
}

select.btn {
  appearance: none;
  padding-right: 20px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23555570'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
}

.tab:hover {
  color: var(--text);
}

thead th:first-child,
thead th:nth-child(2) {
  text-align: left;
}

thead th:hover {
  color: var(--text);
}

thead th.sorted {
  color: var(--accent);
}

tbody tr {
  border-bottom: 1px solid var(--border);
  transition: background 0.1s;
}

tbody tr:hover td,
tbody tr:hover th {
  background: #14141f !important;
}

tbody td,
tbody th {
  padding: 7px 14px;
  white-space: nowrap;
  text-align: right;
  font-weight: 400;
}

tbody td:first-child,
tbody th:first-child {
  text-align: left;
}

tr.sold td,
tr.sold th {
  opacity: 0.45;
  background: var(--sold-bg);
}

tr.sold:hover td,
tr.sold:hover th {
  opacity: 0.7;
}

tr.want-below td,
tr.want-below th {
  background: var(--want-hit-red);
}

tr.want-above td,
tr.want-above th {
  background: var(--want-hit-green);
}

.flash-cell {
  animation: flashPulse 0.35s ease-out;
}

@keyframes flashPulse {
  0% {
    background: rgba(79, 195, 247, 0.35);
  }
  100% {
    background: transparent;
  }
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 160px;
}

.favicon {
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 2px;
  flex-shrink: 0;
  object-fit: contain;
}

.name-link:hover {
  text-decoration: underline;
}

.name-link.line-through {
  text-decoration: line-through;
  color: var(--muted);
}

.neu {
  color: var(--text);
}

.dim {
  color: var(--muted);
}

.chart-row td {
  padding: 0;
  background: #0c0c14 !important;
}

.chart-row img {
  display: block;
  opacity: 0.85;
  transition: opacity 0.2s;
  max-width: 100%;
}

.chart-row img:hover {
  opacity: 1;
}

.chart-imgs {
  display: flex;
  gap: 4px;
  padding: 6px 14px;
  flex-wrap: wrap;
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
  font-size: var(--font-size-sm);
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

.modal h2 {
  font-size: var(--font-size-sm);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border2);
}

.field input,
.field select {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border2);
  color: var(--text);
  font-family: "IBM Plex Mono", monospace;
  font-size: var(--font-size-md);
  padding: 7px 10px;
  border-radius: 2px;
  outline: none;
  transition: border-color 0.15s;
}

.field input:focus,
.field select:focus {
  border-color: var(--accent);
}

.field input::placeholder {
  color: var(--muted);
}

.field-hint {
  font-size: var(--font-size-xxs);
  color: var(--muted);
  margin-top: 4px;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: var(--font-size-xs);
}

.checkbox-row input[type="checkbox"] {
  width: auto;
  cursor: pointer;
  accent-color: var(--accent);
}

footer {
  padding: 10px 24px;
  border-top: 1px solid var(--border2);
  font-size: var(--font-size-xxs);
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

footer .alerts-box {
  flex: 1;
  font-size: var(--font-size-xxs);
  color: var(--green);
  background: #001a08;
  border: 1px solid #003015;
  padding: 4px 10px;
  border-radius: 2px;
  max-height: 60px;
  overflow-y: auto;
}

.section-header td {
  font-size: var(--font-size-xxxs);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 10px 14px 4px;
  background: var(--bg) !important;
  border-top: 1px solid var(--border2);
}

.totals-row td {
  font-weight: 500;
  border-top: 1px solid var(--border2);
  font-size: var(--font-size-md);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--muted);
}

.empty-state .big {
  font-size: var(--font-size-xxl);
  margin-bottom: 10px;
}

.empty-state p {
  font-size: var(--font-size-xs);
  margin-top: 6px;
}

input[type="radio"] {
  accent-color: var(--accent);
  cursor: pointer;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.last-refresh {
  font-size: var(--font-size-xxs);
  color: var(--muted);
}

[title] {
  cursor: help;
}

.chart-card-name {
  font-weight: 500;
  font-size: var(--font-size-md);
  color: var(--accent);
}

.chart-card-meta {
  font-size: var(--font-size-xxs);
  color: var(--muted);
}

.chart-card img {
  width: 100%;
  display: block;
}

::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

::-webkit-scrollbar-track {
  background: var(--bg);
}

::-webkit-scrollbar-thumb {
  background: var(--border2);
  border-radius: 2px;
}

.mic-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border2);
  background: var(--bg);
  color: var(--muted);
  cursor: pointer;
  font-size: var(--font-size-xl);
  transition: all 0.15s;
  flex-shrink: 0;
}

.mic-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.mic-btn.listening {
  border-color: var(--red);
  color: var(--red);
  animation: micPulse 1s ease-in-out infinite;
}

@keyframes micPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(255, 76, 106, 0.4);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(255, 76, 106, 0);
  }
}

.voice-status {
  font-size: var(--font-size-xxs);
  color: var(--muted);
  padding: 5px 0 0;
  min-height: 16px;
  font-style: italic;
  letter-spacing: 0.04em;
}

.voice-status.active {
  color: var(--red);
}

.voice-status.ok {
  color: var(--green);
}

.voice-status.err {
  color: var(--yellow);
}

.voice-transcript {
  font-size: var(--font-size-xxs);
  color: var(--muted);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 2px;
  padding: 5px 8px;
  margin-top: 6px;
  min-height: 28px;
  word-break: break-all;
  display: none;
}

.modal-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border2);
}

.modal-header-row h2 {
  margin: 0;
  padding: 0;
  border: none;
  font-size: var(--font-size-sm);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}
</style>
