---
title: Badge Registry
---

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vitepress'
import RegistryList from './.vitepress/theme/components/RegistryList.vue'
import RegistryFilters, { type RegistryQuery } from './.vitepress/theme/components/RegistryFilters.vue'
import { facets, searchBadges } from './.vitepress/registry'

const pageSize = 20
const facetData = facets()
const query = ref<RegistryQuery>({})

const sortOptions = [
  { label: 'Newest issued', value: 'newest' },
  { label: 'Vendor A→Z', value: 'vendor' },
  { label: 'Application A→Z', value: 'application' },
  { label: 'Version (latest first)', value: 'version' }
] as const

type SortOption = (typeof sortOptions)[number]['value']

const route = useRoute()
const router = useRouter()

const sort = ref<SortOption>(parseSort(route.query?.sort))
const page = ref(parsePage(route.query?.page))

const results = computed(() => {
  const filtered = searchBadges({ ...query.value })
  return sortBadges(filtered, sort.value)
})

const total = computed(() => results.value.length)

const paged = computed(() => {
  const start = (page.value - 1) * pageSize
  return results.value.slice(start, start + pageSize)
})

watch(
  () => route.query?.page,
  (value) => {
    page.value = parsePage(value)
  }
)

watch(
  () => route.query?.sort,
  (value) => {
    sort.value = parseSort(value)
  }
)

function handleQueryUpdate(value: RegistryQuery) {
  const changed = JSON.stringify(query.value) !== JSON.stringify(value)
  query.value = { ...value }
  if (changed) {
    setPage(1)
  } else {
    applyRoute()
  }
}

function handleSortChange(event: Event) {
  const next = (event.target as HTMLSelectElement).value as SortOption
  sort.value = next
  applyRoute()
}

function handlePageChange(next: number) {
  setPage(next)
}

function setPage(next: number) {
  const clamped = Math.max(1, next)
  if (page.value !== clamped) {
    page.value = clamped
  }
  applyRoute({ page: clamped })
}

function parseSort(value: unknown): SortOption {
  if (typeof value === 'string') {
    const match = sortOptions.find((option) => option.value === value)
    if (match) return match.value
  }
  return 'newest'
}

function parsePage(value: unknown): number {
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }
  return 1
}

function applyRoute(overrides: { page?: number } = {}) {
  const target = buildQuery({
    page: overrides.page ?? page.value,
    sort: sort.value
  })
  const current = JSON.stringify(normalize(route.query ?? {}))
  const next = JSON.stringify(target)
  if (current !== next) {
    router.replace({ query: target })
  }
}

function buildQuery(params: { page: number; sort: SortOption }) {
  const output: Record<string, string> = {}
  Object.entries(query.value).forEach(([key, value]) => {
    if (value && value.length) {
      output[key] = value
    }
  })
  if (params.sort && params.sort !== 'newest') {
    output.sort = params.sort
  }
  if (params.page > 1) {
    output.page = String(params.page)
  }
  return output
}

function normalize(input: Record<string, unknown>) {
  const normalized: Record<string, string> = {}
  Object.entries(input).forEach(([key, value]) => {
    if (typeof value === 'string' && value.length) {
      normalized[key] = value
    }
  })
  return normalized
}

function sortBadges(list: ReturnType<typeof searchBadges> = [], sortValue: SortOption) {
  const copy = [...list]
  switch (sortValue) {
    case 'vendor':
      return copy.sort((a, b) => a.vendor.localeCompare(b.vendor))
    case 'application':
      return copy.sort((a, b) => a.application.localeCompare(b.application))
    case 'version':
      return copy.sort((a, b) => compareSemver(b.version, a.version))
    case 'newest':
    default:
      return copy.sort((a, b) => (a.issued_at < b.issued_at ? 1 : -1))
  }
}

function compareSemver(a: string, b: string) {
  const toParts = (value: string) => value.split(/[.+-]/).map((part) => Number.parseInt(part, 10))
  const partsA = toParts(a)
  const partsB = toParts(b)
  const length = Math.max(partsA.length, partsB.length)
  for (let index = 0; index < length; index += 1) {
    const left = partsA[index] ?? 0
    const right = partsB[index] ?? 0
    if (left !== right) {
      return left - right
    }
  }
  return 0
}
</script>

# Badge registry

The registry aggregates every badge defined in the repository. Use the filters to explore badges by vendor, application, badge type, and lifecycle state.

<div class="registry-toolbar">
  <RegistryFilters
    :query="query"
    :vendors="facetData.vendors"
    :apps="facetData.apps"
    :types="facetData.types"
    :statuses="facetData.statuses"
    @update:query="handleQueryUpdate"
  />
  <label class="sort" for="sort">Sort by
    <select id="sort" name="sort" :value="sort" @change="handleSortChange">
      <option v-for="option in sortOptions" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </label>
</div>

<RegistryList
  :items="paged"
  :page="page"
  :page-size="pageSize"
  :total="total"
  @change-page="handlePageChange"
/>

<style scoped>
.registry-toolbar {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.sort {
  align-self: flex-end;
  display: inline-flex;
  flex-direction: column;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.sort select {
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  padding: 0.45rem 0.6rem;
  min-width: 200px;
  background: var(--vp-c-bg);
}

.sort select:focus {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

@media (min-width: 960px) {
  .registry-toolbar {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }

  .sort {
    align-items: flex-end;
  }
}
</style>
