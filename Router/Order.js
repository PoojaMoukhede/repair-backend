const express = require("express");
const router = express.Router();
const mysqlConnection = require("../Connection");

// Add one or more order
router.post("/ordersMultiple", async (req, res) => {
  try {
    const orders = req.body;
    const insertedOrders = [];

    for (const order of orders) {
      const {
        orderID,
        CustomeID,
        productName,
        serialNumber,
        HSN,
        isInWarranty,
        customerReason,
        orderRemark,
        orderDate,
        orderNumber,
        CustomerReferance,
        RefrenceDate,
        CustomeName,
      } = order;

      const isInWarrantyValue = isInWarranty || false;

      const data = {
        orderID,
        CustomeID,
        productName,
        serialNumber,
        HSN,
        isInWarranty: isInWarrantyValue,
        customerReason: customerReason || "N/A",
        orderRemark: orderRemark || "N/A",
        orderDate,
        orderNumber,
        CustomerReferance: CustomerReferance || "N/A",
        RefrenceDate,
        CustomeName,
      };

      const result = await new Promise((resolve, reject) => {
        const sql = `INSERT INTO orders SET ?`;
        mysqlConnection.query(sql, data, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      insertedOrders.push(data);
    }

    return res
      .status(201)
      .json({ msg: "Orders added successfully", orders: insertedOrders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/orders/:id", (req, res) => {
  const CustomeID = req.params.id;

  let sql = "SELECT * FROM orders WHERE CustomeID = ?";
  mysqlConnection.query(sql, CustomeID, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res.status(200).json(results[0]);
  });
});
// Delete a Order
router.delete("/orders/:id", (req, res) => {
  const CustomeID = req.params.id;

  let sql = `DELETE FROM orders WHERE CustomeID = ?`;
  mysqlConnection.query(sql, CustomeID, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res.status(200).json({ msg: "Order deleted successfully" });
  });
});

// same orders with details
router.get("/ordersWithSame", async (req, res) => {
  try {
    const { CustomeID, orderNumber } = req.query;
    const sql = `SELECT i.*, o.*, c.* 
    FROM invoices i 
    JOIN orders o ON i.orderID = o.orderID
    JOIN customers c ON o.CustomeID = c.CustomeID
    WHERE o.CustomeID = ? AND o.orderNumber = ? AND (o.isInProcess = true OR o.isReady = true OR o.isBilled = true OR o.isScraped = true)`;

    mysqlConnection.query(sql, [CustomeID, orderNumber], (err, results) => {
      if (err) {
        console.error("Error fetching invoices: ", err);
        return res.status(500).json({ error: "Internal Server Error" });
      } else {
        // Calculate subtotal and GST for each invoice
        let subtotal = 0;
        let totalAmountWithGST = 0;
        let hasIGST = false;
        let ffTotal = 0;

        results.forEach((invoice) => {
          subtotal += parseFloat(invoice.subTotal || 0);
          ffTotal += parseFloat(invoice.ff || 0);
          if (parseFloat(invoice.igst) > 0) {
            hasIGST = true;
          }
        });

        // Calculate GST based on subtotal
        const gstRate = 0.18;
        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        if (hasIGST) {
          igst = gstRate * subtotal;
        } else {
          cgst = sgst = (gstRate / 2) * subtotal;
        }

        // Calculate total amount with GST including ff
        totalAmountWithGST =
          parseFloat(subtotal) +
          parseFloat(cgst) +
          parseFloat(sgst) +
          parseFloat(igst) +
          parseFloat(ffTotal);

        const data = {
          CustomeID,
          orderNumber,
          subtotal,
          cgst,
          sgst,
          igst,
          ffTotal,
          totalAmountWithGST,
        };

        // let sqlInsertbillingtable = `INSERT INTO billingtable SET ?`;
        // mysqlConnection.query(
        //   sqlInsertbillingtable,
        //   data,
        //   (billingErr, billingResult) => {
        //     if (billingErr) {
        //       console.log(billingErr);
        //       return res.status(500).json({ error: "Internal Server Error" });
        //     }
        //     return res.status(201).json({
        //       msg: "Billing Details added successfully",
        //     });
        //   }
        // );
        return res.status(200).json({
          invoices: results,
          subtotal,
          totalAmountWithGST,
          ffTotal,
          igst,
          cgst,
          sgst,
        });
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all Order
router.get("/orders", (req, res) => {
  let sql = "SELECT * FROM orders";
  mysqlConnection.query(sql, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res.status(200).json(results);
  });
});

// Get a specific Order
router.get("/orders/:id", (req, res) => {
  const CustomeID = req.params.id;

  let sql = "SELECT * FROM orders WHERE CustomeID = ?";
  mysqlConnection.query(sql, CustomeID, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res.status(200).json(results[0]);
  });
});
// get last  order detail
router.get("/orderslast/:orderID", (req, res) => {
  const orderID = req.params.orderID;

  let sql = "SELECT * FROM orders WHERE orderID = ?";
  mysqlConnection.query(sql, orderID, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res.status(200).json(results[0]);
  });
});
 
//------------------- state change and get data 
router.put("/orders/:orderId/:orderState", (req, res) => { 
  const { orderId, orderState } = req.params;

  // Validate the status to prevent SQL injection
  const validStatus = ["isinprocess", "isready", "isbilled", "isscraped"];
  if (!validStatus.includes(orderState)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const updateQuery = `
    UPDATE orders
    SET ${validStatus
      .map((status) => `${status} = ${status === orderState ? true : false}`)
      .join(", ")}, orderState = ?
    WHERE orderID = ?;
  `;

  mysqlConnection.query(updateQuery, [orderState, orderId], (err, results) => {
    if (err) {
      console.error("Error executing MySQL query:", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    if (results.affectedRows === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({ success: true });
  });
}); 

router.get("/isinprocess-orders", (req, res) => {
  mysqlConnection.query(
    'SELECT * FROM orders WHERE orderState = "isinprocess"',
    (err, results) => {
      if (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res.json(results);
    }
  );
}); 
//  merged order and customer details
router.get("/orders/:orderID/details", (req, res) => {
  const orderID = req.params.orderID;
  const sql = `
    SELECT o.*, c.*
    FROM orders o
    JOIN customers c ON o.CustomeID = c.CustomeID
    WHERE o.orderID = ?`;

  mysqlConnection.query(sql, [orderID], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    const mergedData = result[0];
    return res.status(200).json(mergedData);
  });
});

// API endpoint to get ready orders
router.get("/isready-orders", (req, res) => {
  mysqlConnection.query(
    'SELECT * FROM orders WHERE orderState = "isready"',
    (err, results) => {
      if (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res.json(results);
    }
  );
});

// API endpoint to get billed orders
router.get("/isbilled-orders", (req, res) => {
  mysqlConnection.query(
    'SELECT * FROM orders WHERE orderState = "isbilled"',
    (err, results) => {
      if (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res.json(results);
    }
  );
});

// API endpoint to get billed orders
router.get("/isscraped-orders", (req, res) => {
  mysqlConnection.query(
    'SELECT * FROM orders WHERE orderState = "isscraped"',
    (err, results) => {
      if (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res.json(results);
    }
  );
}); 

router.get("/isinvoiced-orders", (req, res) => {
  mysqlConnection.query(
    "SELECT * FROM orders WHERE isinvoiced = true",
    (err, results) => {
      if (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res.json(results);
    }
  );
});

router.put("/isinvoiced/:orderID", (req, res) => {
  const isinvoiced = req.body.isinvoiced;
  const orderID = req.params.orderID;
  mysqlConnection.query(
    `UPDATE orders
    SET isinvoiced = true
    WHERE orderID = ?;
  `,
    orderID,
    (err, results) => {
      if (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res.json(results);
    }
  );
});

router.delete("/orders/:id", (req, res) => {
  const orderID = req.params.id;

  let sql = "DELETE FROM orders WHERE orderID = ?";
  mysqlConnection.query(sql, orderID, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.status(204).send(results);
  });
});


module.exports = router;

// Add one Order
// router.post("/orders", async (req, res) => {
//   const {
//     orderID,
//     CustomeID,
//     productName,
//     serialNumber,
//     HSN,
//     isInWarranty,
//     customerReason,
//     orderRemark,
//     orderDate,
//     orderNumber,
//     CustomerReferance,
//     RefrenceDate,
//     CustomeName,
//   } = req.body;
//   const isInWarrantyValue = req.body.isInWarranty || false;
//   const data = {
//     orderID: req.body.orderID,
//     CustomeID: req.body.CustomeID,
//     productName: req.body.productName,
//     serialNumber: req.body.serialNumber,
//     HSN: req.body.HSN,
//     isInWarranty: isInWarrantyValue,
//     customerReason: req.body.customerReason || "N/A",
//     orderRemark: req.body.orderRemark || "N/A",
//     orderDate: req.body.orderDate,
//     orderNumber: req.body.orderNumber,
//     CustomerReferance: req.body.CustomerReferance || "N/A",
//     RefrenceDate: req.body.RefrenceDate,
//     CustomeName: req.body.CustomeName,
//   };
//   console.log(data);
//   let sql = `INSERT INTO orders SET ?`;
//   mysqlConnection.query(sql, data, (err, result) => {
//     if (err) {
//       console.log(err);
//       return res.status(500).json({ error: "Internal Server Error" });
//     }
//     return res
//       .status(201)
//       .json({ msg: "Order added successfully", massage: data });
//   });
// });