<script setup lang="ts">
import { computed } from 'vue'
import type { Badge } from '../../registry'

const props = defineProps<{ badge: Badge }>()

const issued = computed(() => formatDate(props.badge.issued_at))
const revoked = computed(() =>
  props.badge.revoked_at ? formatDate(props.badge.revoked_at) : undefined
)

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(date)
}
</script>

<template>
  <article class="badge-card" :class="{ revoked: badge.revoked }" aria-live="polite">
    <header class="badge-card__header">
      <div>
        <h3 class="badge-card__title">
          <span class="vendor">{{ badge.vendor }}</span>
          <span class="sep">/</span>
          <span class="application">{{ badge.application }}</span>
        </h3>
        <p class="badge-card__meta">
          Version <strong>{{ badge.version }}</strong>
          · <span class="badge-type">{{ badge.badge_type }}</span>
        </p>
      </div>
      <span class="status" :data-status="badge.status">
        {{ badge.status }}
      </span>
    </header>

    <dl class="badge-card__dates">
      <div>
        <dt>Issued</dt>
        <dd>{{ issued }}</dd>
      </div>
      <div v-if="badge.revoked_at">
        <dt>Revoked</dt>
        <dd>{{ revoked }}</dd>
      </div>
    </dl>

    <p v-if="badge.notes" class="badge-card__notes">{{ badge.notes }}</p>
    <slot />
  </article>
</template>

<style scoped>
.badge-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  background: var(--vp-c-bg-soft);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.badge-card:hover,
.badge-card:focus-within {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft-up);
}

.badge-card.revoked {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-danger-2);
  opacity: 0.9;
}

.badge-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.badge-card__title {
  margin: 0;
  font-size: 1.1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: baseline;
}

.badge-card__title .vendor {
  font-weight: 600;
}

.badge-card__meta {
  margin: 0.25rem 0 0;
  color: var(--vp-c-text-2);
  font-size: 0.95rem;
}

.status {
  text-transform: uppercase;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.status[data-status='revoked'] {
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger-1);
}

.status[data-status='pending'] {
  background: var(--vp-c-warning-soft);
  color: var(--vp-c-warning-1);
}

.badge-card__dates {
  display: flex;
  gap: 1.5rem;
  margin: 0;
}

.badge-card__dates dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
}

.badge-card__dates dd {
  margin: 0.25rem 0 0;
  font-weight: 600;
}

.badge-card__notes {
  margin: 0;
  padding: 0.75rem;
  border-left: 3px solid var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}
</style>
