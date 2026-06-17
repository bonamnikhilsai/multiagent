/**
 * models/Conversation.js
 * Chronological multi-turn interaction schema.
 */
const mongoose = require('mongoose');

const DebateRoundSchema = new mongoose.Schema(
  {
    roundIndex: { type: Number, required: true },
    researcherText: { type: String, default: '' },
    criticText: { type: String, default: '' },
  },
  { _id: false }
);

const TurnSchema = new mongoose.Schema(
  {
    userPrompt: { type: String, required: true },
    debateRounds: [DebateRoundSchema],
    finalSynthesis: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    turns: [TurnSchema],
    status: {
      type: String,
      enum: ['pending', 'streaming', 'complete', 'error'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
    collection: 'Conversations',
  }
);

module.exports = mongoose.model('Conversation', ConversationSchema);
