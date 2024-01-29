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
    customerReason: req.body.customerReason || 'N/A',
    orderRemark: req.body.orderRemark || 'N/A',
    orderDate: req.body.orderDate,
    orderNumber:req.body.orderNumber,
    CustomerReferance: req.body.CustomerReferance || 'N/A',
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
router.post("/ordersmultiple", async (req, res) => {
  try {
    const orders = Array.isArray(req.body) ? req.body : [req.body];

    const lastOrderNumber = await getLastOrderNumber();

    for (const order of orders) {
      const nextOrderNumber = generateNextOrderNumber(lastOrderNumber);
      const data = {
        orderID: order.orderID,
        CustomeID: order.CustomeID,
        productName: order.productName,
        serialNumber: order.serialNumber,
        HSN: order.HSN,
        isInWarranty: order.isInWarranty,
        customerReason: order.customerReason,
        orderRemark: order.orderRemark,
        orderDate: order.orderDate,
        orderNumber: nextOrderNumber,
        CustomerReferance: order.CustomerReferance,
        RefrenceDate: order.RefrenceDate,
        CustomeName: order.CustomeName,
      };

      console.log(data);

      let sql = `INSERT INTO orders SET ?`;

      await new Promise((resolve, reject) => {
        mysqlConnection.query(sql, data, (err, result) => {
          if (err) {
            console.log(err);
            return reject(err);
          }
          resolve();
        });
      });
    }

    return res.status(201).json({ msg: "Orders added successfully", orders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
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

function getLastOrderNumber() {
  return new Promise((resolve, reject) => {
    let sql =
      `SELECT MAX(CAST(SUBSTRING(orderNumber, LOCATE('/', orderNumber) + 1) AS UNSIGNED)) AS maxNumber FROM orders`;
      // `SELECT MAX(CAST(RIGHT(orderNumber, LENGTH(orderNumber) - LOCATE('/', REVERSE(orderNumber))) AS UNSIGNED)) AS maxNumber FROM orders`  //with this getting NaN as 000NaN
    mysqlConnection.query(sql, (err, result) => {
      console.log(`result : ${result}`);
      if (err) {
        reject(err);
      } else {
        const maxNumber = result[0].maxNumber;
        console.log(`maxnumber getLastOrderNumber : ${maxNumber}`);
        resolve(maxNumber === null ? 0 : maxNumber);
      }
    });
  });
}

function generateNextOrderNumber(lastInvoiceNumber) {
  const currentYear = new Date().getFullYear();
  console.log(`currentYear : ${currentYear}`);
  const currentMonth = new Date().toLocaleString("en-US", { month: "short" }); //.toUpperCase() -- Jan
  const nextNumber = lastInvoiceNumber + 1;
  console.log(`nextNumber : ${nextNumber}`);
  const formattedNumber = nextNumber.toString().padStart(5, "0");
  console.log(`formattedNumber : ${formattedNumber}`);
  return `RPR/${currentYear
    .toString()
    .substring(2)}/${currentMonth}/${formattedNumber}`;
} //'RPR/24/Jan/00025'

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

// not in use
// router.get("/order-item-list-with-customer", (req, res) => {
//   const sql = `
//     SELECT orders.*, customers.*
//     FROM orders
//     LEFT JOIN customers ON orders.CustomeID = customers.CustomeID
//     WHERE orders.orderState = 'order_item_list' AND
//           orders.isInProcess = true AND
//           orders.isReady = false AND
//           orders.isBilled = false AND
//           orders.isScraped = false
//   `;

//   mysqlConnection.query(sql, (err, result) => {
//     if (err) {
//       console.log(err);
//       return res.status(500).json({ error: "Internal Server Error" });
//     }

//     return res.status(200).json(result);
//   });
// });

// Update a Order
// router.put("/orders/:id", (req, res) => {
//   const CustomeID = req.params.id;
//   const newData = {
//     CustomeName: req.body.CustomeName,
//     CustomeEmail: req.body.CustomeEmail,
//     CustomeContactNo: req.body.CustomeContactNo,
//     CustomerAddress: req.body.CustomerAddress,
//     CustomerPinCode: req.body.CustomerPinCode,
//     CustomerCountry: req.body.CustomerCountry,
//     CustomerState: req.body.CustomerState,
//     CustomerCity: req.body.CustomerCity,
//     CustomerGST: req.body.CustomerGST,
//   };

//   let sql = `UPDATE orders SET ? WHERE CustomeID = ?`;
//   mysqlConnection.query(sql, [newData, CustomeID], (err, result) => {
//     if (err) {
//       console.log(err);
//       return res.status(500).json({ error: "Internal Server Error" });
//     }
//     return res.status(200).json({ msg: "Order updated successfully" });
//   });
// });

// Add one Order
// router.post("/orders", async(req, res) => {
//   const {
//       orderID,
//       CustomeID,
//       productName,
//       serialNumber,
//       HSN,
//       includeHsn,
//       rate,
//       tax,
//       total,
//       customerReason,
//       orderRemark,
//       orderDate,
//       orderNumber,
//       CustomerReferance,
//       RefrenceDate,
//       CustomerName
//     } = req.body
//     const lastOrderNumber = await getLastOrderNumber();
//     const nextOrderNumber = generateNextOrderNumber(lastOrderNumber);
//     const data=
//     {
//       orderID:req.body.orderID ,
//       CustomeID:req.body.CustomeID,
//       productName:req.body.productName,
//       serialNumber:req.body.serialNumber,
//       HSN:req.body.HSN,
//       includeHsn:req.body.includeHsn,
//       rate:req.body.rate,
//       tax:req.body.tax,
//       total:req.body.total,
//       customerReason:req.body.customerReason,
//       orderRemark:req.body.orderRemark,
//       orderDate:req.body.orderDate,
//       orderNumber:nextOrderNumber,
//       CustomerReferance:req.body.CustomerReferance,
//       RefrenceDate:req.body.RefrenceDate,
//       CustomerName:req.body.CustomerName
//       // isInProcess: req.body.isInProcess,
//       // isReady: req.body.isReady,
//       // isBilled: req.body.isBilled,
//       // isScraped: req.body.isScraped,
//     }
//     console.log(data)
//   let sql = `INSERT INTO orders SET ?`;
//   mysqlConnection.query(sql, data, (err, result) => {
//     if (err) {
//       console.log(err);
//       return res.status(500).json({ error: "Internal Server Error" });
//     }
//     return res.status(201).json({ msg: "Order added successfully" ,massage:data});
//   });
// });

// Add one or more order
// router.post("/orders", async (req, res) => {
//   try {
//     const orders = Array.isArray(req.body) ? req.body : [req.body];

//     const lastOrderNumber = await getLastOrderNumber();

//     for (const order of orders) {
//       const nextOrderNumber = generateNextOrderNumber(lastOrderNumber);
//       const data = {
//         orderID: order.orderID,
//         CustomeID: order.CustomeID,
//         productName: order.productName,
//         serialNumber: order.serialNumber,
//         HSN: order.HSN,
//         includeHsn: order.includeHsn,
//         // rate: order.rate,
//         // tax: order.tax,
//         // total: order.total,
//         customerReason: order.customerReason,
//         orderRemark: order.orderRemark,
//         orderDate: order.orderDate,
//         orderNumber: nextOrderNumber,
//         CustomerReferance: order.CustomerReferance,
//         RefrenceDate: order.RefrenceDate,
//         CustomerName: order.CustomerName,
//       };

//       console.log(data);

//       let sql = `INSERT INTO orders SET ?`;

//       await new Promise((resolve, reject) => {
//         mysqlConnection.query(sql, data, (err, result) => {
//           if (err) {
//             console.log(err);
//             return reject(err);
//           }
//           resolve();
//         });
//       });
//     }

//     return res.status(201).json({ msg: "Orders added successfully", orders });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// router.post("/orders", (req, res) => {
//   const orders = req.body.map((order) => ({

//     CustomeID: req.body.CustomeID,
//     productName: req.body.productName,
//     serialNumber: req.body.serialNumber,
//     HSN: req.body.HSN,
//     includeHsn: req.body.includeHsn,
//     rate: req.body.rate,
//     tax: req.body.tax,
//     total: req.body.total,
//     customerReason: req.body.customerReason,
//     orderRemark: req.body.orderRemark,
//     orderDate: req.body.orderDate,
//     orderNumber: req.body.orderNumber,
//     CustomerReferance: req.body.CustomerReferance,
//     RefrenceDate: req.body.RefrenceDate,
//     CustomerName: req.body.CustomerName,

//   }));

//   let sql =
//     "INSERT INTO orders (CustomeID, productName, serialNumber, HSN, includeHsn, rate, tax, total, customerReason, orderRemark, orderDate, orderNumber, CustomerReferance, RefrenceDate, CustomerName) VALUES ?";
//   mysqlConnection.query(
//     sql,
//     [orders.map((order) => Object.values(order))],
//     (err, result) => {
//       if (err) {
//         console.log(err);
//         return res.status(500).json({ error: "Internal Server Error" });
//       }
//       return res
//         .status(201)
//         .json({ msg: "Orders added successfully", message: orders });
//     }
//   );
// });
