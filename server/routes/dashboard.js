const express = require("express");
const db = require("../db");

const router = express.Router();

function round2(n) {
  return Math.round(n * 100) / 100;
}

router.get("/", (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM

  const bills = db
    .prepare("SELECT * FROM bills WHERE user_id = ? AND active = 1 ORDER BY name")
    .all(req.userId);

  const paydays = db
    .prepare(
      "SELECT * FROM paydays WHERE user_id = ? AND strftime('%Y-%m', date) = ? ORDER BY date"
    )
    .all(req.userId, month);

  const savedByBill = db
    .prepare(
      `SELECT c.bill_id, SUM(c.amount) as saved FROM contributions c
       JOIN paydays p ON p.id = c.payday_id
       WHERE p.user_id = ? AND strftime('%Y-%m', p.date) = ?
       GROUP BY c.bill_id`
    )
    .all(req.userId, month);
  const savedMap = new Map(savedByBill.map((r) => [r.bill_id, r.saved]));

  const billsStatus = bills.map((bill) => {
    const saved = round2(savedMap.get(bill.id) || 0);
    const remaining = round2(Math.max(bill.monthly_amount - saved, 0));
    return {
      id: bill.id,
      name: bill.name,
      category: bill.category,
      dueDay: bill.due_day,
      monthlyAmount: bill.monthly_amount,
      perQuincena: round2(bill.monthly_amount / 2),
      saved,
      remaining,
      covered: saved >= bill.monthly_amount,
    };
  });

  const totalIncome = round2(paydays.reduce((sum, p) => sum + p.income_amount, 0));
  const totalMonthlyBills = round2(bills.reduce((sum, b) => sum + b.monthly_amount, 0));
  const totalSaved = round2(billsStatus.reduce((sum, b) => sum + b.saved, 0));
  const disponible = round2(totalIncome - totalSaved);

  res.json({
    month,
    bills: billsStatus,
    paydaysCount: paydays.length,
    totals: {
      income: totalIncome,
      monthlyBills: totalMonthlyBills,
      saved: totalSaved,
      disponible,
    },
  });
});

module.exports = router;
