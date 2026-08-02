require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const { requireAuth } = require("./auth");
const authRoutes = require("./routes/auth");
const billsRoutes = require("./routes/bills");
const paydaysRoutes = require("./routes/paydays");
const dashboardRoutes = require("./routes/dashboard");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/bills", requireAuth, billsRoutes);
app.use("/api/paydays", requireAuth, paydaysRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Presupuesto de la casa escuchando en http://localhost:${PORT}`);
});
