<template>
  <div
    class="modal-backdrop"
    :class="{ open: showAddDialog !== null }"
    @click.self="showAddDialog = null"
  >
    <div class="modal">
      <h2>
        {{ formPosition.id !== "" ? "Edit Position" : "Add Position" }}
      </h2>
      <div class="form-grid">
        <div class="field form-half">
          <label>NAME</label>
          <input v-model="formPosition.name" placeholder="SAP" />
        </div>

        <div class="field">
          <label>URL <span class="muted">(fav-icon)</span></label>
          <input v-model="formPosition.url" placeholder="sap.com" />
        </div>
        <img
          v-if="validUrl(formPosition.url)"
          class="favicon"
          :src="faviconUrl(formPosition.url)"
          alt=""
        />

        <div class="field">
          <label>ISIN</label>
          <input v-model="formPosition.isin" placeholder="DE0007164600" />
        </div>
        <div class="field">
          <label>EXCHANGE-TAG</label>
          <select v-model="formPosition.exchange">
            <option
              v-for="exchange in exchanges"
              :key="exchange"
              :value="exchange"
            >
              {{ exchange }}
            </option>
          </select>
          <div class="field-hint">(FinZero, TradRep, DKB, ING…)</div>
        </div>

        <div class="field">
          <label>AMOUNT (Shares)</label>
          <input
            v-model.number="formPosition.amount"
            type="number"
            step="any"
            placeholder="0"
          />
        </div>
        <div class="field">
          <label>BUY RATE (€)</label>
          <input
            v-model.number="formPosition.rate"
            type="number"
            step="any"
            placeholder="0.00"
          />
        </div>

        <div class="field form-full">
          <label>Want Rate (€) <span class="muted">– alert target</span></label>
          <input
            v-model.number="formPosition.want"
            type="number"
            step="any"
            placeholder="optional"
          />
        </div>
      </div>
      <div class="checkbox-row">
        <div>
          <label>
            <input v-model="addAnotherAfterSave" type="checkbox" />
            Add another position after save
          </label>
        </div>
        <div>
          <button class="btn" @click="showAddDialog = null">
            {{ addAnotherAfterSave ? "Close" : "Cancel" }}
          </button>
          <button class="btn accent" @click="savePosition">
            {{ addAnotherAfterSave ? "Add" : "Save" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NewPosition, Position } from "./types";
import { createEmptyPosition, createNewPosition, faviconUrl, uid } from "./utils";

const showAddDialog = defineModel<string | null>("addOrEdit", {
  required: true,
});
const positions = defineModel<Position[]>("positions", { required: true });
const formPosition = ref<NewPosition>(createNewPosition());
const addAnotherAfterSave = ref(true);

function resetFormPosition() {
  formPosition.value = createNewPosition();
}

const exchanges = computed(() => {
  const vals = new Set<string>();
  positions.value.forEach((pos) => {
    if (pos.exchange) {
      vals.add(pos.exchange);
    }
  });
  return Array.from(vals.values());
});

watch(
  showAddDialog,
  (value) => {
    if (value === null) {
      resetFormPosition();
      return;
    }

    if (value === "") {
      resetFormPosition();
      return;
    }

    const editing = positions.value.find((position) => position.id === value);
    formPosition.value = editing ? { ...editing } : createEmptyPosition();
  },
  { immediate: true },
);

function validUrl(url: string | null): boolean {
  return !!url && url.length > 4 && url.split(".").length > 1;
}

function validatePosition(position: NewPosition): Position | null {
  const isValid =
    position.amount &&
    position.isin?.trim() &&
    position.name?.trim() &&
    position.rate;
  if (!isValid) {
    return null;
  } else {
    return {
      id: position.id ?? uid(),
      name: position.name!.trim(),
      url: position.url?.trim() ?? null,
      isin: position.isin!.trim(),
      exchange: position.exchange,
      amount: position.amount!,
      rate: position.rate!,
      want: position.want,
      sold: !!position.sold,
      hide: !!position.hide,
    };
  }
}

function savePosition(): void {
  const pos = validatePosition(formPosition.value);
  if (!pos) {
    // todo use form validate instead with hint in form
    alert("Position incomplete");
  } else {
    const trimmedName = pos.name.trim();
    const isEdit = formPosition.value.id !== "";

    const payload: Position = {
      id: isEdit ? formPosition.value.id : `${trimmedName}-${Date.now()}`,
      name: trimmedName,
      url: pos.url,
      isin: pos.isin.trim().toUpperCase(),
      exchange: pos.exchange,
      amount: Number(pos.amount) || 0,
      rate: Number(pos.rate) || 0,
      want: pos.want ? Number(pos.want) : null,
      sold: pos.sold,
      hide: pos.hide,
    };

    if (isEdit) {
      const idx = positions.value.findIndex(
        (position) => position.id === formPosition.value.id,
      );
      if (idx >= 0) {
        positions.value[idx] = payload;
      }
    } else {
      positions.value.push(payload);
    }

    if (addAnotherAfterSave.value && !isEdit) {
      resetFormPosition();
      return;
    }

    showAddDialog.value = null;
  }
}
</script>

<style scoped>
/* Layout Helpers */
.checkbox-group {
  display: flex;
  gap: 20px;
  align-items: center;
  padding-top: 6px;
}

.checkbox-row {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--muted);
  font-size: var(--font-size-xs);
  text-transform: none;
  letter-spacing: 0;
}

.checkbox-row > div:nth-child(1) {
  margin-right: auto;
}
.checkbox-row > div:nth-child(2) {
  margin-left: auto;
}

.checkbox-row input[type="checkbox"] {
  width: auto;
  cursor: pointer;
  accent-color: var(--accent);
}

/* Header Styling from original */
h2 {
  font-size: var(--font-size-xs);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border2);
}

/* Restoring original label look */
.muted {
  color: var(--muted);
  text-transform: none;
  font-weight: normal;
}

.field-hint {
  font-size: var(--font-size-xxs);
  color: var(--muted);
  margin-top: 4px;
}

/* Input Focus States */
input:focus,
select:focus {
  border-color: var(--accent) !important;
  outline: none;
}

.field select {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border2);
  color: var(--text);
  padding: 7px 10px;
}

.field label {
  display: block;
  font-size: var(--font-size-xxs);
  color: var(--text);
  margin-bottom: 5px;
  letter-spacing: 0.1em;
}

.form-full {
  grid-column: 1 / -1;
}

.form-half {
  grid-column: 1 / -2;
}
</style>
