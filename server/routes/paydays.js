const express = require("express");
const db = require("../db");

const router = express.Router();

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Crea una quincena y reparte automaticamente la mitad de cada factura activa
router.post("/", (req, res) => {
  const { date, incomeAmount, note } = req.body || {};
  if (!date || incomeAmount === undefined || Number(incomeAmount) < 0) {
    return res.status(400).json({ error: "Fecha y monto de ingreso son requeridos" });
  }

  const bills = db
    .prepare("SELECT * FROM bills WHERE user_id = ? AND active = 1")
    .all(req.userId);

  const insertPayday = db.prepare(
    "INSERT INTO paydays (user_id, date, income_amount, note) VALUES (?, ?, ?, ?)"
  );
  const insertContribution = db.prepare(
    "INSERT INTO contributions (payday_id, bill_id, amount) VALUES (?, ?, ?)"
  );

  const createPaydayWithContributions = db.transaction(() => {
    const result = insertPayday.run(req.userId, date, Number(incomeAmount), note || null);
    const paydayId = result.lastInsertRowid;

    const contributions = bills.map((bill) => {
      const amount = round2(bill.monthly_amount / 2);
      insertContribution.run(paydayId, bill.id, amount);
      return { billId: bill.id, billName: bill.name, amount };
    });

    return { paydayId, contributions };
  });

  const { paydayId, contributions } = createPaydayWithContributions();

  const totalApartado = round2(contributions.reduce((sum, c) => sum + c.amount, 0));
  const disponible = round2(Number(incomeAmount) - totalApartado);

  const payday = db.prepare("SELECT * FROM paydays WHERE id = ?").get(paydayId);
  res.status(201).json({ ...payday, contributions, totalApartado, disponible });
});

router.get("/", (req, res) => {
  const { month } = req.query; // formato YYYY-MM
  let paydays;
  if (month) {
    paydays = db
      .prepare(
        "SELECT * FROM paydays WHERE user_id = ? AND strftime('%Y-%m', date) = ? ORDER BY date"
      )
      .all(req.userId, month);
  } else {
    paydays = db
      .prepare("SELECT * FROM paydays WHERE user_id = ? ORDER BY date DESC LIMIT 50")
      .all(req.userId);
  }

  const withContributions = paydays.map((p) => {
    const contributions = db
      .prepare(
        `SELECT c.*, b.name as bill_name FROM contributions c
         JOIN bills b ON b.id = c.bill_id WHERE c.payday_id = ?`
      )
      .all(p.id);
    const totalApartado = round2(contributions.reduce((sum, c) => sum + c.amount, 0));
    return {
      ...p,
      contributions,
      totalApartado,
      disponible: round2(p.income_amount - totalApartado),
    };
  });

  res.json(withContributions);
});

router.delete("/:id", (req, res) => {
  const payday = db
    .prepare("SELECT * FROM paydays WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!payday) return res.status(404).json({ error: "Quincena no encontrada" });

  db.prepare("DELETE FROM paydays WHERE id = ?").run(payday.id);
  res.json({ ok: true });
});

module.exports = router;
