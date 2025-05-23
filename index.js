require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const User = require('./models/user'); // importa el modelo

const app = express();
app.use(cors());
app.use(express.json());

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error de conexión a MongoDB:', err));

app.post('/auth/google', async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name } = payload;

    console.log('Usuario:', email, given_name, family_name);

    // Guardar en MongoDB (upsert)
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});

