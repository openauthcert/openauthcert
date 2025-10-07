<script setup lang="ts">
import { computed } from 'vue'
import type { Badge } from '../../registry'
import BadgeCard from './BadgeCard.vue'
import EvidenceLinks from './EvidenceLinks.vue'

const props = defineProps<{
  items: Badge[]
  page: number
  pageSize: number
  total: number
}>()

const emit = defineEmits<{
  (e: 'changePage', value: number): void
}>()

const totalPages = computed(() => (props.total ? Math.ceil(props.total / props.pageSize) : 1))

const start = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const end = computed(() => (props.total === 0 ? 0 : Math.min(props.page * props.pageSize, props.total)))

function goTo(page: number) {
  const clamped = Math.min(Math.max(page, 1), totalPages.value)
  if (clamped !== props.page) {
    emit('changePage', clamped)
  }
}

const repoBase = 'https://github.com/openauthcert/openauthcert/blob/main/'
</script>

<template>
  <section class="registry-list" aria-live="polite">
    <header class="registry-list__header">
      <h2>Badges</h2>
      <p>{{ total }} result<span v-if="total !== 1">s</span> · Showing {{ start }}-{{ end }}</p>
    </header>

    <div v-if="items.length" class="registry-list__grid">
      <BadgeCard v-for="badge in items" :key="badge.slug" :badge="badge">
        <div class="registry-list__actions">
          <a
            class="view-json"
            :href="`${repoBase}${badge.path}`"
            target="_blank"
            rel="noopener"
          >
            View JSON
          </a>
          <EvidenceLinks :badge="badge" />
        </div>
      </BadgeCard>
    </div>
    <p v-else class="registry-list__empty">No badges match the selected filters yet.</p>

    <nav class="registry-list__pager" aria-label="Badge pagination" v-if="totalPages > 1">
      <button type="button" @click="goTo(page - 1)" :disabled="page <= 1">
        Previous
      </button>
      <span aria-live="polite">Page {{ page }} of {{ totalPages }}</span>
      <button type="button" @click="goTo(page + 1)" :disabled="page >= totalPages">
        Next
      </button>
    </nav>
  </section>
</template>

<style scoped>
.registry-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.registry-list__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
}

.registry-list__header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.registry-list__header p {
  margin: 0;
  color: var(--vp-c-text-2);
}

.registry-list__grid {
  display: grid;
  gap: 1rem;
}

.registry-list__actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.registry-list__actions .view-json {
  align-self: flex-start;
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-size: 0.9rem;
}

.registry-list__actions .view-json:hover,
.registry-list__actions .view-json:focus {
  background: var(--vp-c-brand-soft);
}

.registry-list__empty {
  margin: 2rem 0;
  text-align: center;
  color: var(--vp-c-text-2);
}

.registry-list__pager {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.registry-list__pager button {
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: var(--vp-c-bg);
  font-weight: 600;
  cursor: pointer;
}

.registry-list__pager button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.registry-list__pager span {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}
</style>
