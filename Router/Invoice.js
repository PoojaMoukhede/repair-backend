const express = require("express");
const router = express.Router();
const mysqlConnection = require("../Connection");

router.post("/invoice", async (req, res) => {
  try {
    const {
      orderID,
      shippingAddress,
      shippingPerson,
      shippingCity,
      shippingState,
      shippingCountry,
      invoiceDate,
      transportationMode,
      subTotal,
      isInWarranty,
      ff,
      hsn,
    } = req.body;

    const gstRate = 0.18; 

    // Calculate GST
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (!isInWarranty) {
      cgst = (gstRate / 2) * subTotal;
      sgst = (gstRate / 2) * subTotal;
      igst = 0; // Assuming 0 IGST for intrastate transactions
    } else {
      cgst = 0;
      sgst = 0;
      igst = 0;
    }

    const totalAmount = isInWarranty ? 0 : subTotal + cgst + sgst + ff;

    const lastInvoiceNumber = await getLastInvoiceNumber();
    const nextInvoiceNumber = generateNextInvoiceNumber(lastInvoiceNumber);
    console.log(lastInvoiceNumber);
    console.log(nextInvoiceNumber);

    const data = {
      orderID,
      invoice_number: nextInvoiceNumber,
      shippingAddress,
      shippingPerson,
      shippingCity,
      shippingState,
      shippingCountry,
      invoiceDate,
      transportationMode,
      subTotal,
      isInWarranty,
      cgst,
      sgst,
      igst,
      ff,
      hsn,
      totalAmount: totalAmount,
    };

    let sql = `INSERT INTO invoices SET ?`;
    mysqlConnection.query(sql, data, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      return res
        .status(201)
        .json({ msg: "Invoice Details added successfully", totalAmount });
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


// function getLastInvoiceNumber() {
//   return new Promise((resolve, reject) => {
//     let sql =
//       "SELECT MAX(CAST(SUBSTRING(invoice_number, LOCATE('/', invoice_number) + 1) AS UNSIGNED)) AS maxNumber FROM invoices";
//     mysqlConnection.query(sql, (err, result) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(result[0].maxNumber || 0);
//       }
//     });
//   });
// }

// function generateNextInvoiceNumber(lastInvoiceNumber) {
//   const currentYear = new Date().getFullYear();
//   const nextNumber = lastInvoiceNumber + 1;
//   const formattedNumber = nextNumber.toString().padStart(5, "0");
//   return `MCIPL/RPR/${currentYear.toString().substring(2)}${(currentYear + 1)
//     .toString()
//     .substring(2)}/${formattedNumber}`;
// }

// console.log(generateNextInvoiceNumber(10));
function getLastInvoiceNumber() {
  return new Promise((resolve, reject) => {
    let sql =
      "SELECT MAX(CAST(SUBSTRING(invoice_number, LOCATE('/', invoice_number) + 1) AS UNSIGNED)) AS maxNumber FROM invoices";
    mysqlConnection.query(sql, (err, result) => {
      if (err) {
        reject(err);
      } else {
        const maxNumber = result[0].maxNumber;
        resolve(maxNumber === null ? 0 : maxNumber);
      }
    });
  });
}

function generateNextInvoiceNumber(lastInvoiceNumber) {
  const currentYear = new Date().getFullYear();
  const nextNumber = lastInvoiceNumber + 1;
  const formattedNumber = nextNumber.toString().padStart(5, "0");
  return `MCIPL/RPR/${currentYear.toString().substring(2)}${(currentYear + 1)
    .toString()
    .substring(2)}/${formattedNumber}`;
}

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
