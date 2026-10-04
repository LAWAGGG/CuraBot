import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildSystemPrompt } from './prompt.js'

const base = {
  name: 'Toko Bu Sari',
  field: 'Kuliner',
  style: 'ramah',
  tasks: 'Layani pesanan dan jawab pertanyaan menu.',
}

test('offline prompt includes address and refuses delivery', () => {
  const prompt = buildSystemPrompt({
    ...base,
    mode: 'offline',
    address: 'Jl. Melati No. 5, Bandung',
    link: 'https://tokobusari.id',
  })
  assert.match(prompt, /Toko Bu Sari/)
  assert.match(prompt, /Kuliner/)
  assert.match(prompt, /Jl\. Melati No\. 5, Bandung/)
  assert.match(prompt, /Jangan menawarkan pengiriman/)
  assert.doesNotMatch(prompt, /Tautan toko/)
})

test('online prompt includes link and refuses onsite', () => {
  const prompt = buildSystemPrompt({
    ...base,
    mode: 'online',
    link: 'https://tokobusari.id',
  })
  assert.match(prompt, /https:\/\/tokobusari\.id/)
  assert.match(prompt, /hanya melayani pemesanan online/)
  assert.doesNotMatch(prompt, /Jl\. Melati/)
})

test('both mode asks the customer to choose', () => {
  const prompt = buildSystemPrompt({
    ...base,
    mode: 'both',
    address: 'Jl. Melati No. 5, Bandung',
    link: 'https://tokobusari.id',
  })
  assert.match(prompt, /Tanyakan lebih dulu/)
  assert.match(prompt, /Jl\. Melati No\. 5, Bandung/)
  assert.match(prompt, /https:\/\/tokobusari\.id/)
})

test('custom style is used verbatim', () => {
  const prompt = buildSystemPrompt({
    ...base,
    mode: 'offline',
    address: 'Jl. Mawar 1',
    style: 'custom',
    styleCustom: 'Selalu panggil pelanggan dengan Kak.',
  })
  assert.match(prompt, /Selalu panggil pelanggan dengan Kak\./)
})

test('preset style and tasks are present', () => {
  const prompt = buildSystemPrompt({ ...base, mode: 'offline', address: 'Jl. Mawar 1' })
  assert.match(prompt, /ramah, hangat, dan santai/)
  assert.match(prompt, /Layani pesanan dan jawab pertanyaan menu\./)
})
