const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors    = require('cors');
const connectDB       = require('./src/config/db');
const { startSLAService } = require('./src/config/slaService');

connectDB();

const app = express();

// ─── Middleware (always before routes) ───────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'PS-CRM API is running!' });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes       = require('./src/routes/authRoutes');
const complaintRoutes  = require('./src/routes/complaintRoutes');
const dashboardRoutes  = require('./src/routes/dashboardRoutes');
const feedbackRoutes   = require('./src/routes/feedbackRoutes');

app.use('/api/auth',       authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/feedback',   feedbackRoutes);

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const { startWhatsAppBot } = require('./src/config/whatsappBot');

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startSLAService();
  startWhatsAppBot();  // ✅ runs only once
});