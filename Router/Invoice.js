const express = require("express");
const router = express.Router();
const mysqlConnection = require("../Connection");

// router.post("/invoice", async (req, res) => {
//   try {
//     const {
//       orderID,
//       invoice_number,
//       shippingAddress,
//       shippingPerson,
//       shippingCity,
//       shippingState,
//       shippingCountry,
//       invoiceDate,
//       transportationMode,
//       subTotal,
//       isInWarranty,
//       ff,
//       // hsn,
//     } = req.body;

//     const gstRate = 0.18;

//     // Calculate GST
//     let cgst = 0;
//     let sgst = 0;
//     let igst = 0;

//     if (shippingState === "Gujarat") {
//       if (!isInWarranty) {
//         cgst = (gstRate / 2) * subTotal;
//         sgst = (gstRate / 2) * subTotal;
//         igst = 0;
//       }
//     } else {
//       igst = gstRate * subTotal;
//     }

//     const totalAmount = isInWarranty ? 0 : subTotal + cgst + sgst + igst + ff;

//     const data = {
//       orderID,
//       invoice_number,
//       // shippingAddress,
//       // shippingPerson,
//       // shippingCity,
//       // shippingState,
//       // shippingCountry,
//       invoiceDate,
//       // transportationMode,
//       subTotal,
//       cgst,
//       sgst,
//       igst,
//       ff,
//       totalAmount: totalAmount,
//     };

//     let sql = `INSERT INTO invoices SET ?`;
//     mysqlConnection.query(sql, data, (err, result) => {
//       if (err) {
//         console.log(err);
//         return res.status(500).json({ error: "Internal Server Error" });
//       }
//       return res
//         .status(201)
//         .json({ msg: "Invoice Details added successfully", totalAmount });
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// });

router.post("/invoice", async (req, res) => {
  try {
    const { orderID, invoice_number, subTotal, ff } = req.body;

    // Check warranty status in the orders table
    let sqlCheckWarranty = `SELECT isInWarranty FROM orders WHERE orderID = ?`;
    mysqlConnection.query(
      sqlCheckWarranty,
      [orderID],
      (warrantyErr, warrantyResult) => {
        if (warrantyErr) {
          console.log(warrantyErr);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        const isInWarranty = warrantyResult;
        // console.log(`isInWarranty : ${isInWarranty}`);

        // Fetch shippingState from the customers table
        let sqlGetShippingState = `SELECT shippingState FROM customers WHERE CustomeID = ?`;
        mysqlConnection.query(
          sqlGetShippingState,
          [orderID],
          (shippingStateErr, shippingStateResult) => {
            if (shippingStateErr) {
              console.log(shippingStateErr);
              return res.status(500).json({ error: "Internal Server Error" });
            }

            const shippingState = shippingStateResult;
            // console.log(`shippingState : ${shippingState}`);
            // Calculate GST and other amounts based on warranty status and shippingState
            let cgst = 0;
            let sgst = 0;
            let igst = 0;
            const gstRate = 0.18;
            if (shippingState === "Gujarat") {
              if (!isInWarranty) {
                cgst = (gstRate / 2) * subTotal;
                sgst = (gstRate / 2) * subTotal;
                igst = 0;
              }
            } else {
              igst = gstRate * subTotal;
            }

            const totalAmount = isInWarranty
              ? 0
              : subTotal + cgst + sgst + igst + ff;

            const data = {
              orderID,
              invoice_number,
              subTotal,
              cgst,
              sgst,
              igst,
              ff,
              totalAmount,
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
                return res
                  .status(201)
                  .json({
                    msg: "Invoice Details added successfully",
                    totalAmount,
                  });
              }
            );
          }
        );
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

module.exports = router;
