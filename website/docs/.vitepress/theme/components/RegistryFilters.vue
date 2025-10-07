<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vitepress'

export interface RegistryQuery {
  q?: string
  vendor?: string
  app?: string
  type?: string
  status?: string
}

const props = defineProps<{
  query: RegistryQuery
  vendors: string[]
  apps: string[]
  types: string[]
  statuses: string[]
}>()

const emit = defineEmits<{
  (e: 'update:query', value: RegistryQuery): void
}>()

const route = useRoute()
const router = useRouter()

const local = reactive<RegistryQuery>({ ...props.query })

const filterKeys = ['q', 'vendor', 'app', 'type', 'status'] as const

type FilterKey = (typeof filterKeys)[number]

const toStringValue = (value: unknown) => {
  if (Array.isArray(value)) return value[0]
  return typeof value === 'string' ? value : undefined
}

watch(
  () => route.query ?? {},
  (query) => {
    let changed = false
    filterKeys.forEach((key) => {
      const next = toStringValue(query[key])
      if (next !== (local[key] ?? undefined)) {
        changed = true
        if (next) {
          local[key] = next
        } else {
          delete local[key]
        }
      }
    })
    if (changed) {
      emit('update:query', { ...local })
    }
  },
  { immediate: true }
)

function update(key: FilterKey, value?: string) {
  if (value && value.length) {
    local[key] = value
  } else {
    delete local[key]
  }
  emit('update:query', { ...local })
  applyRoute()
}

function applyRoute() {
  const preserved: Record<string, any> = { ...(route.query ?? {}) }
  filterKeys.forEach((key) => {
    delete preserved[key]
  })

  const next: Record<string, string> = {}
  filterKeys.forEach((key) => {
    const value = local[key]
    if (value && value.length) {
      next[key] = value
    }
  })

  const target = { ...preserved, ...next }
  const current = route.query ?? {}
  const same = filterKeys.every((key) => toStringValue(current[key]) === local[key])
  if (!same || Object.keys(target).length !== Object.keys(current).length) {
    router.replace({ query: target })
  }
}
</script>

<template>
  <form class="filters" @submit.prevent aria-label="Registry filters">
    <div class="field">
      <label for="search">Search</label>
      <input
        id="search"
        type="search"
        name="search"
        :value="local.q ?? ''"
        @input="update('q', ($event.target as HTMLInputElement).value.trim())"
        placeholder="Search vendor, application, notes..."
      />
    </div>

    <div class="field">
      <label for="vendor">Vendor</label>
      <select
        id="vendor"
        name="vendor"
        :value="local.vendor ?? ''"
        @change="update('vendor', ($event.target as HTMLSelectElement).value || undefined)"
      >
        <option value="">All vendors</option>
        <option v-for="vendor in vendors" :key="vendor" :value="vendor">{{ vendor }}</option>
      </select>
    </div>

    <div class="field">
      <label for="app">Application</label>
      <select
        id="app"
        name="app"
        :value="local.app ?? ''"
        @change="update('app', ($event.target as HTMLSelectElement).value || undefined)"
      >
        <option value="">All applications</option>
        <option v-for="app in apps" :key="app" :value="app">{{ app }}</option>
      </select>
    </div>

    <div class="field">
      <label for="type">Badge type</label>
      <select
        id="type"
        name="type"
        :value="local.type ?? ''"
        @change="update('type', ($event.target as HTMLSelectElement).value || undefined)"
      >
        <option value="">All badge types</option>
        <option v-for="type in types" :key="type" :value="type">{{ type }}</option>
      </select>
    </div>

    <div class="field">
      <label for="status">Status</label>
      <select
        id="status"
        name="status"
        :value="local.status ?? ''"
        @change="update('status', ($event.target as HTMLSelectElement).value || undefined)"
      >
        <option value="">All statuses</option>
        <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
      </select>
    </div>
  </form>
</template>

<style scoped>
.filters {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  background: var(--vp-c-bg-soft);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

label {
  font-weight: 600;
  font-size: 0.9rem;
}

input,
select {
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

input:focus,
select:focus {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
</style>
