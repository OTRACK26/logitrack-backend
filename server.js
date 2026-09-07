const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);
  socket.on('disconnect', () => console.log(`❌ Cliente desconectado`));
});

app.get('/health', (req, res) => res.json({ status: 'OK' }));

// --- EL CÓDIGO CORREGIDO ESTÁ AQUÍ ---
app.post('/api/events', async (req, res) => {
  const { tracking_number, status, receiver_name, receiver_dni } = req.body;
  
  // 1. Guardar en el historial
  const { error: error1 } = await supabase
    .from('tracking_events')
    .insert([{ shipment_id: 1, event_status: status, receiver_name, receiver_dni }]);
  if (error1) return res.status(500).json({ error: error1.message });
  
  // 2. ¡NUEVO! Actualizar la tabla principal que lee Vercel
  const { error: error2 } = await supabase
    .from('shipments')
    .update({ current_status: status })
    .eq('tracking_number', tracking_number);
  if (error2) return res.status(500).json({ error: error2.message });
  
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
