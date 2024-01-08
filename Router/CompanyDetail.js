const express = require("express");
const router = express.Router();
const mysqlConnection = require("../Connection");

router.post("/companyDetail", (req, res) => {
  const data = {
    companyName: req.body.companyName,
    companyAddress: req.body.companyAddress,
    companyCity: req.body.companyCity,
    companyState: req.body.companyState,
    companyCountry: req.body.companyCountry,
    companyPhone: req.body.companyPhone,
    companyGST: req.body.companyGST,
    companyPAN: req.body.companyPAN,
    companyWebsite: req.body.companyWebsite,
    companyCIN: req.body.companyCIN,
    bankName: req.body.bankName,
    branchName: req.body.branchName,
    acNumber: req.body.acNumber,
    IFSC: req.body.IFSC,
    UPI: req.body.UPI,
    companyEmail:req.body.companyEmail
  };

  let sql = `INSERT INTO companyDetail SET ?`;
  mysqlConnection.query(sql, data, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res.status(201).json({ msg: "Details added successfully" });
  });
});

router.get("/companyDetail", (req, res) => {
    let sql = "SELECT * FROM companyDetail";
    mysqlConnection.query(sql, (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      return res.status(200).json(results);
    });
  });

module.exports = router;