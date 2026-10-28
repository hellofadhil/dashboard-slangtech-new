await fetch('/api/whatsapp/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '6281234567890',
    message: 'Halo dari SlangTech',
  }),
})
