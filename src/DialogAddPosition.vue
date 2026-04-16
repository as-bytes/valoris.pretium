<template>
  <div
    class="modal-backdrop"
    :class="{ open: showAddDialog }"
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
          <label>Exchange</label><input v-model="formPosition.exchange" />
        </div>
        <div class="field">
          <label>Amount</label
          ><input v-model.number="formPosition.amount" type="number" />
        </div>
        <div class="field">
          <label>Buy Rate</label
          ><input v-model.number="formPosition.rate" type="number" />
        </div>
        <div class="field form-full">
          <label>Want</label
          ><input v-model.number="formPosition.want" type="number" />
        </div>
      </div>
      <div class="form-row">
        <button class="btn" @click="showAddDialog = null">Cancel</button>
        <button class="btn accent" @click="savePosition">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Position } from "./types";
import { createEmptyPosition, savePositions } from "./utils";

const getEditPos = (): Position | undefined => {
  if (showAddDialog.value !== "") {
    return positions.value.find((_) => _.id === showAddDialog.value);
  }
};

const showAddDialog = defineModel<string | null>("addOrEdit", {
  required: true,
});
const positions = defineModel<Position[]>("positions", { required: true });

const formPosition = ref<Position>(getEditPos() ?? createEmptyPosition());

function savePosition(): void {
  if (
    !formPosition.value ||
    !formPosition.value.name.trim() ||
    !formPosition.value.isin.trim()
  ) {
    return;
  }

  const payload: Position = {
    id: formPosition.value.name.trim(),
    name: formPosition.value.name.trim(),
    url: formPosition.value.url.trim(),
    isin: formPosition.value.isin.trim().toUpperCase(),
    exchange: formPosition.value.exchange.trim(),
    amount: Number(formPosition.value.amount) || 0,
    rate: Number(formPosition.value.rate) || 0,
    want: formPosition.value.want ? Number(formPosition.value.want) : null,
    sold: formPosition.value.sold,
    hide: formPosition.value.hide,
  };

  if (formPosition.value.id !== "") {
    const idx = positions.value.findIndex((position) => position.id === formPosition.value.id);
    if (idx >= 0) {
      positions.value[idx] = payload;
    }
  } else {
    positions.value.push(payload);
  }
  savePositions(positions.value);
  showAddDialog.value = null;
  // todo sotrage-listener? void doRefresh();
}
</script>
