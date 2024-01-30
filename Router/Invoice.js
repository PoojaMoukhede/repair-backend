const express = require("express");
const router = express.Router();
const mysqlConnection = require("../Connection");

router.post("/invoice", async (req, res) => {
  try {
    // const { orderID, invoice_number, subTotal, ff, CustomeID } = req.body;
    const orderID = req.body.orderID ;
    const invoice_number = req.body.invoice_number;
    const subTotal = req.body.subTotal || 0;
    const ff = req.body.ff || 0;
   const CustomeID = req.body.CustomeID;
    // console.log(req.body);
    // Check warranty status in the orders table
    let sqlCheckWarranty = `SELECT isInWarranty FROM orders WHERE orderID = ?`;
    mysqlConnection.query(
      sqlCheckWarranty,
      orderID,
      (warrantyErr, warrantyResult) => {
        if (warrantyErr) {
          console.log(warrantyErr);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        // Check if warrantyResult is not empty and contains at least one element
        if (warrantyResult && warrantyResult.length > 0) {
          const isInWarranty = warrantyResult;

          // Fetch ShippingState from the customers table
          let sqlGetShippingState = `SELECT ShippingState FROM customers WHERE CustomeID = ?`;
          mysqlConnection.query(
            sqlGetShippingState,
            CustomeID,
            (shippingStateErr, shippingStateResult) => {
              if (shippingStateErr) {
                console.log(shippingStateErr);
                return res.status(500).json({ error: "Internal Server Error" });
              }

              // Check if shippingStateResult is not empty and contains at least one element
              if (shippingStateResult && shippingStateResult.length > 0) {
                const ShippingState = shippingStateResult;
                console.log();
                // Calculate GST and other amounts based on warranty status and ShippingState
                let cgst = 0;
                let sgst = 0;
                let igst = 0;
                const gstRate = 0.18;
                console.log(isInWarranty[0].isInWarranty);
                if (
                  ShippingState[0].ShippingState === "Gujarat" ||
                  ShippingState[0].ShippingState === "gujarat" ||
                  ShippingState[0].ShippingState === "GUJARAT"
                ) {
                  if (isInWarranty[0].isInWarranty === 0) {
                    cgst = (gstRate / 2) * subTotal;
                    sgst = (gstRate / 2) * subTotal;
                    igst = 0;
                  } else {
                    igst = gstRate * subTotal;
                  }
                } else {
                  igst = gstRate * subTotal;
                }

                const totalAmount = isInWarranty[0].isInWarranty
                  ? 0
                  : parseFloat(subTotal) +
                    parseFloat(cgst) +
                    parseFloat(sgst) +
                    parseFloat(igst) +
                    parseFloat(ff);

                const data = {
                  orderID,
                  invoice_number,
                  subTotal,
                  cgst,
                  sgst,
                  igst,
                  ff: parseFloat(ff),
                  totalAmount: parseInt(totalAmount),
                  CustomeID,
                };

                let sqlInsertInvoice = `INSERT INTO invoices SET ?`;
                mysqlConnection.query(
                  sqlInsertInvoice,
                  data,
                  (insertErr, insertResult) => {
                    if (insertErr) {
                      console.log(insertErr);
                      return res
                        .status(500)
                        .json({ error: "Internal Server Error" });
                    }
                    return res.status(201).json({
                      msg: "Invoice Details added successfully",
                      totalAmount,
                    });
                  }
                );
              } else {
                return res.status(404).json({
                  error: "Shipping state not found for the given orderID.",
                });
              }
            }
          );
        } else {
          return res
            .status(404)
            .json({ error: "Warranty data not found for the given orderID." });
        }
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/invoice", (req, res) => {
  let sql = "SELECT * FROM invoices";
  mysqlConnection.query(sql, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res.status(200).json(results);
  });
});

router.get("/invoice/:id", (req, res) => {
  const orderID = req.params.id;

  let sql = "SELECT * FROM invoices WHERE orderID = ?";
  mysqlConnection.query(sql, orderID, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res.status(200).json(results[0]);
  });
});

router.get("/invoiceData/:orderID", (req, res) => {
  const orderID = req.params.orderID;
  const sql = `
  SELECT i.*, o.*, c.*
  FROM invoices i
  JOIN orders o ON i.orderID = o.orderID
  JOIN customers c ON o.CustomeID = c.CustomeID
  WHERE o.orderID = ? AND (o.isInProcess = true OR o.isReady = true OR o.isBilled = true OR o.isScraped = true)
   `;

  mysqlConnection.query(sql, [orderID], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const mergedInvoiceData = result[0];
    console.log(mergedInvoiceData);
    return res.status(200).json(mergedInvoiceData);
  });
});
router.get("/invoicelast/:invoiceID", (req, res) => {
  const invoiceID = req.params.invoiceID;

  let sql = "SELECT * FROM invoices WHERE invoiceID = ?";
  mysqlConnection.query(sql, invoiceID, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res.status(200).json(results[0]);
  });
});

module.exports = router;
