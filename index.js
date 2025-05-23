require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const { Client, GatewayIntentBits } = require('discord.js');
const User = require('./models/user');

const app = express();
app.use(cors());
app.use(express.json());

// ======= GOOGLE LOGIN SETUP =======
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

app.post('/auth/google', async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name } = payload;

    const user = await User.findOneAndUpdate(
      { email },
      { given_name, family_name },
      { new: true, upsert: true }
    );

    res.json({ message: 'Login exitoso y usuario guardado', user });
  } catch (error) {
    res.status(401).json({ message: 'Token inválido', error: error.message });
  }
});

// ======= DISCORD SETUP =======
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let isReady = false;
let cachedMessages = [];

discordClient.once('ready', () => {
  console.log(`🤖 Bot de Discord conectado como ${discordClient.user.tag}`);
  isReady = true;
});

discordClient.on('error', error => {
  console.error('❌ Error en Discord Client:', error);
});

discordClient.login(process.env.DISCORD_TOKEN);

app.get('/messages', async (req, res) => {
  if (!isReady) {
    return res.status(503).send('⏳ Bot aún no está listo.');
  }

  try {
    const channel = await discordClient.channels.fetch(process.env.CHANNEL_ID);
    const messages = await channel.messages.fetch({ limit: 100 });

    cachedMessages = messages.map(msg => ({
      author: msg.author.username,
      content: msg.content,
      timestamp: msg.createdAt
    }));

    res.json(cachedMessages);
  } catch (error) {
    console.error('❌ Error al obtener mensajes:', error);
    res.status(500).send('Error al obtener mensajes.');
  }
});

// ======= START SERVER =======
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
