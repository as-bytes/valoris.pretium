<template>
  <div
    class="modal-backdrop"
    :class="{ open: showImportDialog }"
    @click.self="close"
  >
    <div class="modal">
      <h2>Import Positions</h2>
      <div class="form-grid">
        <div class="field form-full">
          <label>IMPORT FORMAT</label>
          <select v-model="importFormat">
            <option value="valoris">Valoris (JSON)</option>
            <option value="finzero">Finanzen.net-Zero (CSV)</option>
          </select>
        </div>

        <div class="field form-full">
          <label class="checkbox-row">
            <input v-model="isAdditive" type="checkbox" />
            Additive import (append to existing positions)
          </label>
        </div>
      </div>

      <div class="status-message" v-if="status">
        {{ status }}
      </div>

      <div class="form-row">
        <button class="btn" @click="close">Cancel</button>
        <button class="btn accent" @click="triggerFileInput">
          Select File & Import
        </button>
      </div>

      <input
        ref="fileInput"
        type="file"
        :accept="fileAccept"
        class="hidden-upload"
        @change="handleFileSelect"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Position } from "./types";
import { parseFinZeroCSV, parseValorisJSON } from "./importUtils";

const showImportDialog = defineModel<boolean>("show", { required: true });
const emit = defineEmits<{
  (e: "import", payload: { positions: Position[]; additive: boolean }): void;
}>();

const importFormat = ref<"valoris" | "finzero">("valoris");
const isAdditive = ref(false);
const status = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

const fileAccept = computed(() => {
  return importFormat.value === "valoris" ? "application/json" : ".csv";
});

function close() {
  showImportDialog.value = false;
  status.value = "";
}

function triggerFileInput() {
  fileInput.value?.click();
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const text = await file.text();
  let positions: Position[] = [];

  if (importFormat.value === "valoris") {
    positions = parseValorisJSON(text);
  } else if (importFormat.value === "finzero") {
    positions = parseFinZeroCSV(text);
  }

  if (positions.length === 0) {
    status.value = "No valid positions found in file.";
    input.value = "";
    return;
  }

  emit("import", { positions, additive: isAdditive.value });
  close();
  input.value = "";
}
</script>

<style scoped>
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
  width: 400px;
  max-width: 95vw;
  border-radius: 4px;
}

h2 {
  font-size: var(--font-size-xs);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border2);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.field label {
  display: block;
  font-size: var(--font-size-xxs);
  color: var(--text);
  margin-bottom: 5px;
  letter-spacing: 0.1em;
}

.field select {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border2);
  color: var(--text);
  padding: 7px 10px;
  font-family: inherit;
  font-size: var(--font-size-sm);
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--muted);
  font-size: var(--font-size-xs);
  text-transform: none;
  letter-spacing: 0;
}

.checkbox-row input[type="checkbox"] {
  width: auto;
  cursor: pointer;
  accent-color: var(--accent);
}

.status-message {
  margin-top: 15px;
  color: var(--red);
  font-size: var(--font-size-xs);
}

.form-row {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 24px;
}

.hidden-upload {
  display: none;
}

.form-full {
  grid-column: 1 / -1;
}
</style>
