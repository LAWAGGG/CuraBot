export const SERVICE_MODES = [
  { id: 'offline', label: 'Offline', hint: 'Pelanggan datang langsung ke toko' },
  { id: 'online', label: 'Online', hint: 'Pesanan dikirim ke pelanggan' },
  { id: 'both', label: 'Keduanya', hint: 'Bisa datang langsung atau dikirim' },
]

export const FIELDS = ['Kuliner', 'Fashion', 'Retail', 'Jasa', 'Kecantikan', 'Elektronik']

export const STYLE_PRESETS = [
  {
    id: 'ramah',
    label: 'Ramah & Santai',
    hint: 'Hangat, akrab, emoji sesekali',
    instruction:
      'Gunakan bahasa Indonesia yang ramah, hangat, dan santai seperti pegawai toko yang menyenangkan. Sapa pelanggan dengan akrab dan boleh memakai emoji sesekali.',
  },
  {
    id: 'formal',
    label: 'Profesional & Formal',
    hint: 'Sopan, rapi, tanpa emoji',
    instruction:
      'Gunakan bahasa Indonesia yang sopan, profesional, dan formal. Hindari bahasa gaul, singkatan tidak baku, dan emoji.',
  },
  {
    id: 'singkat',
    label: 'Singkat & Efisien',
    hint: 'Langsung ke inti, 2–3 kalimat',
    instruction:
      'Jawab dengan singkat, jelas, dan langsung ke inti. Maksimal 2–3 kalimat per balasan. Hindari basa-basi berlebihan.',
  },
  {
    id: 'persuasif',
    label: 'Antusias & Persuasif',
    hint: 'Semangat, tawarkan produk',
    instruction:
      'Balas dengan semangat dan antusias. Tawarkan produk atau tambahan yang relevan secara natural tanpa terkesan memaksa.',
  },
]

export const EMPTY_ANSWERS = {
  name: '',
  mode: '',
  address: '',
  coords: '',
  link: '',
  field: '',
  style: '',
  styleCustom: '',
  tasks: '',
}

function styleSection(answers) {
  if (answers.style === 'custom') {
    const custom = (answers.styleCustom || '').trim()
    return custom || 'Gunakan bahasa Indonesia yang ramah dan sopan.'
  }
  const preset = STYLE_PRESETS.find((item) => item.id === answers.style)
  return preset?.instruction || 'Gunakan bahasa Indonesia yang ramah dan sopan.'
}

function serviceSection(answers) {
  const address = (answers.address || '').trim() + (answers.coords ? ` (koordinat: ${answers.coords})` : '')
  const link = (answers.link || '').trim()
  if (answers.mode === 'offline') {
    return {
      description: `Offline — pelanggan datang langsung ke ${address}`,
      linkLine: '',
      rules: `Pesanan hanya bisa dinikmati/diambil langsung di ${address}. Jangan menawarkan pengiriman. Jika pelanggan bertanya tentang pengiriman, jelaskan bahwa layanan hanya tersedia di tempat.`,
    }
  }
  if (answers.mode === 'online') {
    return {
      description: `Online — pesanan dikirim ke alamat pelanggan (${link})`,
      linkLine: `\n- Tautan toko: ${link}`,
      rules: `Toko hanya melayani pemesanan online dengan pengiriman ke alamat pelanggan. Jika pelanggan ingin datang langsung, jelaskan bahwa layanan hanya tersedia secara online.`,
    }
  }
  return {
    description: `Offline di ${address} dan online via ${link}`,
    linkLine: `\n- Tautan toko: ${link}`,
    rules: `Toko melayani makan di tempat/pengambilan di ${address} dan pengiriman online. Tanyakan lebih dulu pelanggan ingin yang mana sebelum meminta alamat.`,
  }
}

export function buildSystemPrompt(answers) {
  const name = (answers.name || '').trim()
  const field = (answers.field || '').trim()
  const tasks = (answers.tasks || '').trim()
  const { description, linkLine, rules } = serviceSection(answers)

  return `Kamu adalah asisten layanan pelanggan AI untuk "${name}", sebuah usaha di bidang ${field}.

TENTANG TOKO
- Nama toko: ${name}
- Layanan: ${description}${linkLine}

GAYA RESPONS
${styleSection(answers)}

TUGAS UTAMA
${tasks}

ATURAN LAYANAN
${rules}`
}
