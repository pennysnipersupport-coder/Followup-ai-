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
  leads.
