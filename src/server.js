require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const internalRoutesFactory = require('./routes/internal');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN || '*' } });

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', apiRoutes);
app.use('/api/internal', internalRoutesFactory(io));

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
});

const port = process.env.PORT || 4000;
server.listen(port, () => console.log(`API running on ${port}`));
