require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const PORT = 3000;
const app = express();

const chatRouter = require('./routes/chat');

app.use(cors({
    origin:'http://localhost:5173' || 'http://localhost:5174' || 'https://travelgenie-ai-6fyo.onrender.com/',
    credentials: true,
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));
// Mount the chat router
app.use('/chat', chatRouter);

// Global Error Handler for unhandled errors
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, '../', 'index.html'));
// });

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});