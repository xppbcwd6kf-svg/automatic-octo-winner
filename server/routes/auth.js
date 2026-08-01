const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { signToken } = require("../auth");

const router = express.Router();

router.post("/register", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Correo y contrasena son requeridos" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "La contrasena debe tener al menos 6 caracteres" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "Ese correo ya esta registrado" });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    .run(email.toLowerCase(), passwordHash);

  const user = { id: result.lastInsertRowid, email: email.toLowerCase() };
  const token = signToken(user);
  res.status(201).json({ token, user: { id: user.id, email: user.email } });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Correo y contrasena son requeridos" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Credenciales invalidas" });
  }

  const token = signToken(user);
  res.json({ token, user: { id: user.id, email: user.email } });
});

module.exports = router;
