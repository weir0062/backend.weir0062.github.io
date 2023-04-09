const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
require('dotenv').config();



// Serve the static files (CSS, JS, etc.)
app.use(express.static(path.join(__dirname)));

const apiKey = process.env.OPENAI_API_KEY;
const url = "https://api.openai.com/v1/chat/completions";

var defaultPrompt = process.env.DEFAULT_PROMPT ;


async function getOpenAIResponse(userMessage) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: defaultPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 1.2,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error from OpenAI API:', JSON.stringify(error, null, 2));
      throw new Error('API response not OK');
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;
    return assistantMessage;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

app.post('/message', async (req, res) => {
  const userMessage = req.body.message;
  const assistantMessage = await getOpenAIResponse(userMessage);
  res.send({ message: assistantMessage });
});

// Serve the Chat.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
