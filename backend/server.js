require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Message = require('./models/Message');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ChatApp API is running 🚀' });
});

// POST /message → store a new message
app.post('/message', async (req, res) => {
  try {
    const { username, message } = req.body;

    if (!username || !message) {
      return res
        .status(400)
        .json({ error: 'username and message are required' });
    }

    const newMessage = new Message({
      username,
      message,
      timestamp: new Date().toISOString(),
    });

    await newMessage.save();

    res.status(201).json({
      success: true,
      data: {
        _id: newMessage._id,
        username: newMessage.username,
        message: newMessage.message,
        timestamp: newMessage.timestamp.toISOString(),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /messages → fetch all messages (latest first)
app.get('/messages', async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ timestamp: -1 })
      .lean();

    const formatted = messages.map((m) => ({
      _id: m._id,
      username: m.username,
      message: m.message,
      timestamp: new Date(m.timestamp).toISOString(),
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});