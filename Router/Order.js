const express = require("express");
const router = express.Router();
const mysqlConnection = require("../Connection");

// Add one Order
router.post("/orders", async (req, res) => {
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
  } = req.body;
  const isInWarrantyValue = req.body.isInWarranty || false;
  const data = {
    orderID: req.body.orderID,
    CustomeID: req.body.CustomeID,
    productName: req.body.productName,
    serialNumber: req.body.serialNumber,
    HSN: req.body.HSN,
    isInWarranty: isInWarrantyValue,
    customerReason: req.body.customerReason || "N/A",
    orderRemark: req.body.orderRemark || "N/A",
    orderDate: req.body.orderDate,
    orderNumber: req.body.orderNumber,
    CustomerReferance: req.body.CustomerReferance || "N/A",
    RefrenceDate: req.body.RefrenceDate,
    CustomeName: req.body.CustomeName,
  };
  console.log(data);
  let sql = `INSERT INTO orders SET ?`;
  mysqlConnection.query(sql, data, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res
      .status(201)
      .json({ msg: "Order added successfully", massage: data });
  });
});

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
router.get("/ordersWithSame", async (req, res) => {
  try {
    const { CustomeID, orderDate } = req.query;
    const sql = "SELECT * FROM orders WHERE CustomeID = ? AND orderDate = ?";
    mysqlConnection.query(sql, [CustomeID, orderDate], (err, results) => {
      if (err) {
        console.error("Error fetching orders: ", err);
        return res.status(500).json({ error: "Internal Server Error" });
      } else {
        return res.status(200).json({ orders: results });
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
// console.log(generateNextOrderNumber(10));
//----------------------

module.exports = router;
