/**
 * server.js — Gateway Orchestrator Engine
 * Express + Socket.io + Mongoose + SSE proxy to Python AI service.
 */
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const authRoutes = require('./routes/auth');
const { authenticateSocket } = require('./middleware/auth');
const Conversation = require('./models/Conversation');

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'debate-arena-gateway',
    version: '1.0.0',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── MongoDB Atlas Connection ─────────────────────────────────────────────────
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_ATLAS_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB Atlas connected — database: agent1');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

// ─── Socket.io Setup ──────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 120000,
  pingInterval: 25000,
});

// Apply JWT authentication middleware to all socket connections
io.use(authenticateSocket);

// ─── Socket Event Handlers ────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const user = socket.user;
  console.log(`🔌 Client connected: ${user.username} (${socket.id})`);

  socket.emit('connected', {
    message: 'Arena connection established.',
    user: { id: user._id, username: user.username },
  });

  // ── submit_query: Main debate trigger ──────────────────────────────────────
  socket.on('submit_query', async ({ query, conversationId }) => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      socket.emit('error', { message: 'Query cannot be empty.' });
      return;
    }

    console.log(`📨 Debate query from ${user.username}: "${query.substring(0, 80)}..."`);

    let conversation;
    let history = [];

    try {
      if (conversationId) {
        conversation = await Conversation.findById(conversationId);
        if (!conversation) throw new Error("Conversation not found");
        
        // Format history for LangChain
        conversation.turns.forEach(turn => {
          history.push({ role: 'user', content: turn.userPrompt });
          history.push({ role: 'assistant', content: turn.finalSynthesis });
        });
      } else {
        conversation = await Conversation.create({
          userId: user._id,
          status: 'streaming',
          turns: [],
        });
      }
      
      socket.emit('session_created', { sessionId: conversation._id.toString() });
    } catch (err) {
      console.error('[Session Create Error]', err.message);
      socket.emit('error', { message: 'Failed to initialize debate session.' });
      return;
    }

    const currentTurnIndex = conversation.turns.length;
    let debateRounds = [];
    let currentRoundIndex = 1;
    let finalSynthesis = '';

    try {
      socket.emit('debate_started', { sessionId: conversation._id.toString(), query });

      const response = await axios({
        method: 'post',
        url: `${process.env.AI_SERVICE_URL}/stream_debate`,
        data: { query: query.trim(), history, session_id: conversation._id.toString() },
        responseType: 'stream',
        timeout: 300000, 
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      });

      const stream = response.data;
      let buffer = '';
      let currentRole = null;

      stream.on('data', async (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          let rawData = line.slice(5).trim();
          if (!rawData) continue;

          if (rawData === '[DONE]') {
            try {
              // Push the final turn object
              const newTurn = {
                userPrompt: query,
                debateRounds,
                finalSynthesis
              };
              await Conversation.findByIdAndUpdate(conversation._id, {
                $push: { turns: newTurn },
                status: 'complete',
              });
            } catch (dbErr) {
              console.error('[Session Update Error]', dbErr.message);
            }
            socket.emit('debate_complete', { sessionId: conversation._id.toString() });
            return;
          }

          if (rawData.startsWith('[ERROR]')) {
            socket.emit('error', { message: rawData.replace('[ERROR]', '') });
            return;
          }

          let role = 'system';
          let content = rawData;
          if (rawData.startsWith('[RESEARCHER]')) { 
            role = 'researcher'; 
            content = rawData.replace('[RESEARCHER]', ''); 
          }
          else if (rawData.startsWith('[CRITIC]')) { 
            role = 'critic'; 
            content = rawData.replace('[CRITIC]', ''); 
          }
          else if (rawData.startsWith('[SYNTHESIZER]')) { 
            role = 'synthesizer'; 
            content = rawData.replace('[SYNTHESIZER]', ''); 
          }

          // Emit to client
          socket.emit('agent_chunk', { role, content, sessionId: conversation._id.toString() });

          // Detect role change to increment round or create new round
          if (currentRole !== role) {
            currentRole = role;
            socket.emit('agent_turn_start', { role, sessionId: conversation._id.toString() });
            
            if (role === 'researcher') {
              if (debateRounds.length > 0 && debateRounds[debateRounds.length - 1].criticText !== '') {
                currentRoundIndex++; // New round starts
              }
              if (!debateRounds.find(r => r.roundIndex === currentRoundIndex)) {
                debateRounds.push({ roundIndex: currentRoundIndex, researcherText: '', criticText: '' });
              }
            }
          }

          // Accumulate into buffer
          if (role === 'researcher') {
            debateRounds[debateRounds.length - 1].researcherText += content;
          } else if (role === 'critic') {
            if (!debateRounds.find(r => r.roundIndex === currentRoundIndex)) {
                debateRounds.push({ roundIndex: currentRoundIndex, researcherText: '', criticText: '' });
            }
            debateRounds[debateRounds.length - 1].criticText += content;
          } else if (role === 'synthesizer') {
            finalSynthesis += content;
          }
        }
      });

      stream.on('end', async () => {
         console.log(`✅ Session ${conversation._id} stream end.`);
      });

      stream.on('error', async (streamErr) => {
        console.error('[Stream Error]', streamErr.message);
        await Conversation.findByIdAndUpdate(conversation._id, { status: 'error' });
        socket.emit('error', { message: 'Debate stream interrupted. Please retry.' });
      });

    } catch (err) {
      console.error('[AI Service Error]', err.message);
      if (conversation) {
        await Conversation.findByIdAndUpdate(conversation._id, { status: 'error' });
      }
      socket.emit('error', {
        message: err.code === 'ECONNREFUSED'
          ? 'AI service is offline. Please start the Python server.'
          : 'Failed to connect to AI debate engine.',
      });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${user.username} — ${reason}`);
  });

  socket.on('error', (err) => {
    console.error(`[Socket Error] ${user.username}:`, err.message);
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Gateway Orchestrator running on http://localhost:${PORT}`);
    console.log(`📡 Socket.io ready | AI Service: ${process.env.AI_SERVICE_URL}`);
  });
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('Graceful shutdown initiated...');
  await mongoose.connection.close();
  server.close(() => process.exit(0));
});
