const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

let leads = [];
let sequences = [];

app.get('/api/leads', (req, res) => res.json(leads));

app.post('/api/leads', (req, res) => {
  const { name, email, phone, propertyInterest, stage, notes } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
  const lead = { id: uuidv4(), name, email, phone, propertyInterest, stage, notes, createdAt: new Date().toISOString(), status: 'active' };
  leads.push(lead);
  res.status(201).json(lead);
});

app.delete('/api/leads/:id', (req, res) => {
  leads = leads.filter(l => l.id !== req.params.id);
  sequences = sequences.filter(s => s.leadId !== req.params.id);
  res.json({ success: true });
});

app.get('/api/sequences/:leadId', (req, res) => {
  res.json(sequences.filter(s => s.leadId === req.params.leadId));
});

app.post('/api/sequences/generate', async (req, res) => {
  const { leadId, leadName, propertyInterest, stage, notes } = req.body;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: `Generate a 5-message real estate follow-up sequence for ${leadName}, interested in ${propertyInterest || 'property'}, stage: ${stage}. Notes: ${notes || 'none'}. Return ONLY a JSON array with objects containing: day, channel (email/sms), subject, message, purpose.` }]
      })
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON found');
    const messages = JSON.parse(match[0]);
    const sequence = { id: uuidv4(), leadId, messages: messages.map(m => ({ ...m, id: uuidv4(), sent: false })), createdAt: new Date().toISOString() };
    sequences.push(sequence);
    res.json(sequence);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sequences/:seqId/messages/:msgId/sent', (req, res) => {
  const seq = sequences.find(s => s.id === req.params.seqId);
  if (!seq) return res.status(404).json({ error: 'Not found' });
  const msg = seq.messages.find(m => m.id === req.params.msgId);
  if (msg) { msg.sent = true; msg.sentAt = new Date().toISOString(); }
  res.json(msg);
});

app.get('/api/stats', (req, res) => {
  res.json({
    totalLeads: leads.length,
    activeLeads: leads.filter(l => l.status === 'active').length,
    totalSequences: sequences.length,
    totalMessages: sequences.reduce((a, s) => a + s.messages.length, 0),
    sentMessages: sequences.reduce((a, s) => a + s.messages.filter(m => m.sent).length, 0)
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
