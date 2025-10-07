<script setup lang="ts">
import type { Badge } from '../../registry'

const props = defineProps<{ badge: Badge }>()

const localEvidencePath = `/registry/evidence/${props.badge.vendor}/${props.badge.application}/${props.badge.version}/`
</script>

<template>
  <section class="evidence" aria-label="Evidence links">
    <h4>Evidence</h4>
    <ul v-if="badge.evidence_urls?.length" class="evidence__list">
      <li v-for="(url, index) in badge.evidence_urls" :key="url">
        <a :href="url" target="_blank" rel="noopener" class="external">
          External evidence {{ index + 1 }}
        </a>
      </li>
      <li>
        <a :href="localEvidencePath" class="internal">
          Repository evidence folder
        </a>
      </li>
    </ul>
    <p v-else class="evidence__empty">
      No evidence URLs provided. Reviewers may still reference the
      <a :href="localEvidencePath">repository evidence folder</a> if populated.
    </p>
  </section>
</template>

<style scoped>
.evidence {
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 0.75rem;
}

.evidence h4 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
}

.evidence__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.evidence__list a {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  text-decoration: none;
  font-size: 0.9rem;
  border: 1px solid transparent;
}

.evidence__list a:hover,
.evidence__list a:focus {
  border-color: var(--vp-c-brand-1);
}

.evidence__list a.external {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.evidence__list a.internal {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.evidence__empty {
  margin: 0;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}
</style>
