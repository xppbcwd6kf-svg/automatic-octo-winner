const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const bills = db
    .prepare(
      "SELECT * FROM bills WHERE user_id = ? AND active = 1 ORDER BY due_day IS NULL, due_day, name"
    )
    .all(req.userId);
  res.json(bills);
});

router.post("/", (req, res) => {
  const { name, monthlyAmount, dueDay, category } = req.body || {};
  if (!name || !monthlyAmount || Number(monthlyAmount) <= 0) {
    return res.status(400).json({ error: "Nombre y monto mensual (mayor a 0) son requeridos" });
  }
  if (dueDay !== undefined && dueDay !== null && (dueDay < 1 || dueDay > 31)) {
    return res.status(400).json({ error: "El dia de vencimiento debe estar entre 1 y 31" });
  }

  const result = db
    .prepare(
      "INSERT INTO bills (user_id, name, monthly_amount, due_day, category) VALUES (?, ?, ?, ?, ?)"
    )
    .run(req.userId, name, Number(monthlyAmount), dueDay || null, category || null);

  const bill = db.prepare("SELECT * FROM bills WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(bill);
});

router.put("/:id", (req, res) => {
  const bill = db
    .prepare("SELECT * FROM bills WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!bill) return res.status(404).json({ error: "Factura no encontrada" });

  const { name, monthlyAmount, dueDay, category } = req.body || {};
  db.prepare(
    "UPDATE bills SET name = ?, monthly_amount = ?, due_day = ?, category = ? WHERE id = ?"
  ).run(
    name ?? bill.name,
    monthlyAmount !== undefined ? Number(monthlyAmount) : bill.monthly_amount,
    dueDay !== undefined ? dueDay : bill.due_day,
    category !== undefined ? category : bill.category,
    bill.id
  );

  const updated = db.prepare("SELECT * FROM bills WHERE id = ?").get(bill.id);
  res.json(updated);
});

router.delete("/:id", (req, res) => {
  const bill = db
    .prepare("SELECT * FROM bills WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!bill) return res.status(404).json({ error: "Factura no encontrada" });

  db.prepare("UPDATE bills SET active = 0 WHERE id = ?").run(bill.id);
  res.json({ ok: true });
});

module.exports = router;
