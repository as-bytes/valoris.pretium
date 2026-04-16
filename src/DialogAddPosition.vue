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
        <div class="field form-full">
          <label>Name</label><input v-model="formPosition.name" />
        </div>
        <div class="field form-full">
          <label>URL</label><input v-model="formPosition.url" />
        </div>
        <div class="field">
          <label>ISIN</label><input v-model="formPosition.isin" />
        </div>
        <div class="field">
          <label>Exchange</label>
          <select v-model="formPosition.exchange">
            <option v-for="exchange in EXCHANGE_OPTIONS" :key="exchange" :value="exchange">
              {{ exchange }}
            </option>
          </select>
        </div>
        <div class="field">
          <label>Amount</label>
          <input v-model.number="formPosition.amount" type="number" />
        </div>
        <div class="field">
          <label>Buy Rate</label>
          <input v-model.number="formPosition.rate" type="number" />
        </div>
        <div class="field form-full">
          <label>Want</label>
          <input v-model.number="formPosition.want" type="number" />
        </div>
        <div class="field form-full">
          <label class="checkbox-row">
            <input v-model="addAnotherAfterSave" type="checkbox" />
            Add another position after save
          </label>
        </div>
      </div>
      <div class="form-row">
        <button class="btn" @click="showAddDialog = null">
          {{ addAnotherAfterSave ? "Back" : "Cancel" }}
        </button>
        <button class="btn accent" @click="savePosition">
          {{ addAnotherAfterSave ? "Add" : "Save" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { Position } from "./types";
import { EXCHANGE_OPTIONS } from "./constants";
import { createEmptyPosition } from "./utils";

const showAddDialog = defineModel<string | null>("addOrEdit", {
  required: true,
});
const positions = defineModel<Position[]>("positions", { required: true });
const formPosition = ref<Position>(createEmptyPosition());
const addAnotherAfterSave = ref(true);

function resetFormPosition() {
  formPosition.value = createEmptyPosition();
}

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

function savePosition(): void {
  if (
    !formPosition.value ||
    !formPosition.value.name.trim() ||
    !formPosition.value.isin.trim()
  ) {
    return;
  }

  const trimmedName = formPosition.value.name.trim();
  const isEdit = formPosition.value.id !== "";

  const payload: Position = {
    id: isEdit ? formPosition.value.id : `${trimmedName}-${Date.now()}`,
    name: trimmedName,
    url: formPosition.value.url.trim(),
    isin: formPosition.value.isin.trim().toUpperCase(),
    exchange: formPosition.value.exchange.trim() || "SC",
    amount: Number(formPosition.value.amount) || 0,
    rate: Number(formPosition.value.rate) || 0,
    want: formPosition.value.want ? Number(formPosition.value.want) : null,
    sold: formPosition.value.sold,
    hide: formPosition.value.hide,
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
</script>

<style scoped>
.field select {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border2);
  color: var(--text);
  padding: 7px 10px;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--text);
  text-transform: none;
  letter-spacing: 0;
}

.checkbox-row input[type="checkbox"] {
  width: auto;
  cursor: pointer;
  accent-color: var(--accent);
}
</style>
