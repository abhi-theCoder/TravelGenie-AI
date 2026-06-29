require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const PORT = 3000;
const app = express();

const chatRouter = require('./routes/chat');

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'https://travelgenie-ai-6fyo.onrender.com/'],
    credentials: true,
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Endpoint to fetch images from Wikipedia search as a stable redirect
app.get('/api/image', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).send('Query parameter q is required');
    }

    // 1. Search Wikipedia for the page matching the query
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const searchRes = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'TravelGenieAI/1.0 (contact: info@travelgenie.com)' }
    });

    const searchResults = searchRes.data?.query?.search;
    if (!searchResults || searchResults.length === 0) {
      return res.status(404).send('Image not found');
    }

    // Use the title of the top search result
    const title = searchResults[0].title;

    // 2. Query pageimages for the original image source URL
    const pageImageUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(title)}&origin=*`;
    const imageRes = await axios.get(pageImageUrl, {
      headers: { 'User-Agent': 'TravelGenieAI/1.0 (contact: info@travelgenie.com)' }
    });

    const pages = imageRes.data?.query?.pages;
    if (!pages) {
      return res.status(404).send('Image not found');
    }

    const pageId = Object.keys(pages)[0];
    const imageUrl = pages[pageId]?.original?.source;

    if (imageUrl) {
      // Redirect browser to the secure Wikipedia image URL
      return res.redirect(imageUrl);
    }

    return res.status(404).send('Image not found');
  } catch (error) {
    console.error('Error in /api/image:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

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