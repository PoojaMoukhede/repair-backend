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
      ff,
      hsn,
    } = req.body;

    // Calculate GST
    // const igst = 0.18 * subTotal; // Assuming 18% IGST / 100
    const cgst = 0.09 * subTotal; // Assuming 9% CGST / 100
    const sgst = 0.09 * subTotal; // Assuming 9% SGST / 100

    // const totalAmount = subTotal + igst + cgst + sgst + ff;
    const totalAmount = subTotal + cgst + sgst;

    const lastInvoiceNumber = await getLastInvoiceNumber();
    const nextInvoiceNumber = generateNextInvoiceNumber(lastInvoiceNumber);

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
      // igst: igst,
      cgst: cgst,
      sgst: sgst,
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

function getLastInvoiceNumber() {
  return new Promise((resolve, reject) => {
    let sql =
      "SELECT MAX(CAST(SUBSTRING(invoice_number, LOCATE('/', invoice_number) + 1) AS UNSIGNED)) AS maxNumber FROM invoices";
    mysqlConnection.query(sql, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0].maxNumber || 0);
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
// console.log(generateNextInvoiceNumber(10));

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

//API for total amount ==== number to words
// router.get("/number-to-word", (req, res) => {
//   const totalAmount = parseFloat(req.query.totalAmount || 0);
//   const amountInWords = convertNumberToWords(totalAmount);
//   res.json({ amountInWords });
// });
// // function for total amount ==== number to words
// function convertNumberToWords(number) {
//   const units = [
//     "",
//     "One",
//     "Two",
//     "Three",
//     "Four",
//     "Five",
//     "Six",
//     "Seven",
//     "Eight",
//     "Nine",
//   ];
//   const teens = [
//     // "",
//     "Eleven",
//     "Twelve",
//     "Thirteen",
//     "Fourteen",
//     "Fifteen",
//     "Sixteen",
//     "Seventeen",
//     "Eighteen",
//     "Nineteen",
//   ];
//   const tens = [
//     // "",
//     "Ten",
//     "Twenty",
//     "Thirty",
//     "Forty",
//     "Fifty",
//     "Sixty",
//     "Seventy",
//     "Eighty",
//     "Ninety",
//   ];

//   const convertChunkToWords = (num) => {
//     const result = [];
//     if (num >= 100) {
//       result.push(units[Math.floor(num / 100)] + " Hundred");
//       num %= 100;
//     }

//     if (num >= 11 && num <= 19) {
//       result.push(teens[num - 11]);
//     } else if (num >= 20) {
//       result.push(tens[Math.floor(num / 10)]);
//       num %= 10;
//     }

//     if (num > 0) {
//       result.push(units[num]);
//     }

//     return result.join(" ");
//   };

//   const chunks = [];
//   let remaining = Math.floor(number);

//   while (remaining > 0) {
//     chunks.push(remaining % 1000);
//     remaining = Math.floor(remaining / 1000);
//   }

//   if (chunks.length === 0) {
//     return "Zero Rupees";
//   }

//   const words = chunks
//     .map((chunk, index) => {
//       if (chunk === 0) {
//         return "";
//       }
//       //   console.log(index);
//       const chunkInWords = convertChunkToWords(chunk);
//       return (
//         chunkInWords +
//         (index === 0 ? "" : ` ${index === 1 ? "Thousand" : "Lakh"}`)
//       );
//     })
//     .reverse()
//     .join(" ");

//   return `${words} Rupees`;
// }