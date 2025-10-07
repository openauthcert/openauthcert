<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import publicKeyPem from '../../../../public/public_key.pem?raw'

interface VerificationState {
  status: 'idle' | 'valid' | 'invalid' | 'error'
  message: string
  details?: string
}

const state = reactive<VerificationState>({
  status: 'idle',
  message: 'Paste a badge JSON document to verify.'
})
const badgeJson = ref('')

const disabled = computed(() => !badgeJson.value.trim())

async function verify() {
  if (!badgeJson.value.trim()) return
  try {
    const parsed = JSON.parse(badgeJson.value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Badge JSON must be an object.')
    }

    const signatureBase64 = (parsed as Record<string, unknown>).digital_signature
    if (typeof signatureBase64 !== 'string' || !signatureBase64.length) {
      throw new Error('digital_signature field missing or empty.')
    }

    const { digital_signature, ...payload } = parsed as Record<string, unknown>
    const canonical = canonicalize(payload)
    const signature = base64ToBytes(signatureBase64)
    const key = await loadPublicKey()
    const encoder = new TextEncoder()
    const valid = await globalThis.crypto!.subtle.verify(
      'Ed25519',
      key,
      signature,
      encoder.encode(canonical)
    )

    if (valid) {
      state.status = 'valid'
      state.message = 'Signature verified. Badge has not been tampered with.'
      state.details = undefined
    } else {
      state.status = 'invalid'
      state.message = 'Signature verification failed.'
      state.details = 'The digital signature does not match the badge payload.'
    }
  } catch (error) {
    state.status = 'error'
    state.message = 'Unable to verify badge.'
    state.details = error instanceof Error ? error.message : String(error)
  }
}

async function loadPublicKey() {
  if (!('crypto' in globalThis) || !globalThis.crypto?.subtle) {
    throw new Error('Ed25519 verification requires a browser with Web Crypto support.')
  }
  const binary = pemToBytes(publicKeyPem)
  return globalThis.crypto.subtle.importKey('spki', binary, { name: 'Ed25519' }, true, ['verify'])
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  )
  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${canonicalize(val)}`)
    .join(',')}}`
}

function pemToBytes(pem: string): ArrayBuffer {
  const contents = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '')
  return base64ToBytes(contents).buffer
}

function base64ToBytes(value: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
  if (typeof globalThis.Buffer !== 'undefined') {
    return Uint8Array.from(globalThis.Buffer.from(value, 'base64'))
  }
  throw new Error('No base64 decoder available in this environment.')
}

async function copyKey() {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    state.status = 'error'
    state.message = 'Clipboard access is not available in this environment.'
    state.details = undefined
    return
  }
  try {
    await navigator.clipboard.writeText(publicKeyPem.trim())
    state.status = 'idle'
    state.message = 'Public key copied to clipboard.'
    state.details = undefined
  } catch (error) {
    state.status = 'error'
    state.message = 'Unable to copy public key.'
    state.details = error instanceof Error ? error.message : String(error)
  }
}
</script>

<template>
  <section class="verify-form" aria-label="Verify badge signature">
    <div class="verify-form__field">
      <label for="badge-json">Badge JSON</label>
      <textarea
        id="badge-json"
        name="badge-json"
        rows="12"
        spellcheck="false"
        v-model="badgeJson"
        placeholder='{ "vendor": "acme" ... }'
      ></textarea>
    </div>
    <div class="verify-form__actions">
      <button type="button" @click="verify" :disabled="disabled">Verify signature</button>
      <button type="button" class="secondary" @click="copyKey">Copy site public key</button>
    </div>
    <output class="verify-form__status" :data-status="state.status" aria-live="polite">
      <strong>{{ state.message }}</strong>
      <span v-if="state.details" class="details">{{ state.details }}</span>
    </output>
  </section>
</template>

<style scoped>
.verify-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.verify-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

textarea {
  width: 100%;
  font-family: var(--vp-font-family-mono);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  padding: 0.75rem;
  min-height: 260px;
}

textarea:focus {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.verify-form__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6rem 1rem;
  font-weight: 600;
  cursor: pointer;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-bg);
}

button.secondary {
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.verify-form__status {
  border-radius: 8px;
  padding: 0.75rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.verify-form__status[data-status='valid'] {
  border-color: var(--vp-c-success-1);
  background: var(--vp-c-success-soft);
}

.verify-form__status[data-status='invalid'],
.verify-form__status[data-status='error'] {
  border-color: var(--vp-c-danger-1);
  background: var(--vp-c-danger-soft);
}

.details {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}
</style>
