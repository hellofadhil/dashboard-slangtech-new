await fetch('/api/zawa/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '6281234567890',
    type: 'text',
    text: 'Halo dari SlangTech',
  }),
})