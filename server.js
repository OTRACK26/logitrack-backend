const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Conexión a Supabase usando variables de entorno
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuración de WebSockets para tiempo real
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  // Recibe la posición del chofer y la retransmite al mapa del cliente/dashboard
  socket.on('truck_location_update', (data) => {
    io.emit('live_map_update', data); 
  });

  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });
});

// Endpoint básico para verificar que el servidor está vivo
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor LogiTrack Operativo' });
});

// Endpoint para guardar un evento de entrega en Supabase
app.post('/api/events', async (req, res) => {
  const { tracking_number, status, receiver_name, receiver_dni } = req.body;
  
  const { data, error } = await supabase
    .from('tracking_events')
    .insert([{ 
       shipment_id: 1, // Para el MVP lo forzamos al envío de prueba
       event_status: status, 
       receiver_name, 
       receiver_dni 
    }]);

  if (error) return res.status(500).json({ error: error.message });
  
  // Avisar a los mapas web que hubo una entrega
  io.emit('status_update', { tracking_number, status });
  res.json({ success: true, data });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
