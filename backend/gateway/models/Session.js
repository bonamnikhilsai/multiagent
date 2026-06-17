/**
 * models/Session.js
 * Mongoose Session schema tracking debate sessions in MongoDB "Agents" collection.
 */
const mongoose = require('mongoose');

const AgentTurnSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['researcher', 'critic', 'synthesizer', 'system', 'error'],
      required: true,
    },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const SessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    query: {
      type: String,
      required: true,
      trim: true,
    },
    agents: [AgentTurnSchema],
    status: {
      type: String,
      enum: ['pending', 'streaming', 'complete', 'error'],
      default: 'pending',
    },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'Agents', // Targeting the "Agents" collection as specified
  }
);

module.exports = mongoose.model('Session', SessionSchema);
