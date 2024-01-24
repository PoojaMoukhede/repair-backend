const express = require("express");
const router = express.Router();
const mysqlConnection = require("../Connection");

// Add a customer
router.post("/customer", (req, res) => {
  const data = {
    CustomeID: req.body.CustomeID,
    CustomeName: req.body.CustomeName,
    CustomeEmail: req.body.CustomeEmail,
    CustomeContactNo: req.body.CustomeContactNo,
    CustomerAddress: req.body.CustomerAddress,
    CustomerPinCode: req.body.CustomerPinCode,
    CustomerCountry: req.body.CustomerCountry,
    CustomerState: req.body.CustomerState,
    CustomerCity: req.body.CustomerCity,
    CustomerGST: req.body.CustomerGST,
    CustomerPAN: req.body.CustomerPAN,
    CustomerCIN: req.body.CustomerCIN,
    CustomerTAN: req.body.CustomerTAN,

    ShippingPerson:req.body.ShippingPerson,
    ShippingAddress:req.body.ShippingAddress,
    ShippingCountry:req.body.ShippingCountry,
    ShippingState:req.body.ShippingState,
    ShippingCity:req.body.ShippingCity,
    TransportationMode:req.body.TransportationMode,
    // FF:req.body.FF,
    // Amount:req.body.Amount
  };

  let sql = `INSERT INTO customers SET ?`;
  mysqlConnection.query(sql, data, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res.status(201).json({ msg: "Customer added successfully" });
  });
});

// Update a customer
router.put("/customer/:id", (req, res) => {
  const CustomeID = req.params.id;
  const newData = {
    CustomeName: req.body.CustomeName,
    CustomeEmail: req.body.CustomeEmail,
    CustomeContactNo: req.body.CustomeContactNo,
    CustomerAddress: req.body.CustomerAddress,
    CustomerPinCode: req.body.CustomerPinCode,
    CustomerCountry: req.body.CustomerCountry,
    CustomerState: req.body.CustomerState,
    CustomerCity: req.body.CustomerCity,
    CustomerGST: req.body.CustomerGST,
  };

  let sql = `UPDATE customers SET ? WHERE CustomeID = ?`;
  mysqlConnection.query(sql, [newData, CustomeID], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res.status(200).json({ msg: "Customer updated successfully" });
  });
});
// Update a customer shipping details
router.put("/shipping/:id", (req, res) => {
  const CustomeID = req.params.id;
  const newData = {
    ShippingPerson:req.body.ShippingPerson,
    ShippingAddress:req.body.ShippingAddress,
    ShippingCountry:req.body.ShippingCountry,
    ShippingState:req.body.ShippingState,
    ShippingCity:req.body.ShippingCity,
    TransportationMode:req.body.TransportationMode,
  };

  let sql = `UPDATE customers SET ? WHERE CustomeID = ?`;
  mysqlConnection.query(sql, [newData, CustomeID], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res.status(200).json({ msg: "Customer updated successfully" });
  });
});

// Delete a customer
router.delete("/customer/:id", (req, res) => {
  const CustomeID = req.params.id;

  let sql = `DELETE FROM customers WHERE CustomeID = ?`;
  mysqlConnection.query(sql, CustomeID, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res.status(200).json({ msg: "Customer deleted successfully" });
  });
});

// Get all customers
router.get("/customer", (req, res) => {
  let sql = "SELECT * FROM customers";
  mysqlConnection.query(sql, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res.status(200).json(results);
  });
});

// Get a specific customer
router.get("/customer/:id", (req, res) => {
  const CustomeID = req.params.id;

  let sql = "SELECT * FROM customers WHERE CustomeID = ?";
  mysqlConnection.query(sql, CustomeID, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res.status(200).json(results[0]);
  });
});

module.exports = router;