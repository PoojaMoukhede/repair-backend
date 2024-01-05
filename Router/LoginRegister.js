const express = require("express");
const router = express.Router();
const app = express();
const secretKey = "SECRET";
const bodyParser = require("body-parser");
const saltRounds = 10;
const mysqlConnection = require("../Connection");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

app.use(express.json());
app.use(bodyParser.json());

// working and integrated with front-end

router.post("/register", (req, res) => {
  const name = req.body.adminName;
  const email = req.body.adminEmail;
  const password = req.body.password;

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    const data = {
      adminID: req.body.adminID,
      adminName: req.body.adminName,
      adminEmail: req.body.adminEmail,
      password: hash,
    };

    let sql = `SELECT * FROM admins WHERE adminEmail='${email}'`;
    mysqlConnection.query(sql, (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }

      if (results.length > 0) {
        res.status(400).json({ msg: "Admin email Already Present" });
      } else {
        sql = "INSERT INTO admins SET ?";
        mysqlConnection.query(sql, data, (err, result) => {
          if (err) {
            console.log(err);
            res.status(500).json({ error: "Internal Server Error" });
            return;
          }
          res.status(201).json({ msg: "Admin registered successfully" });
        });
      }
    });
  });
});

router.post("/login", (req, res) => {
  const email = req.body.adminEmail;
  const password = req.body.password;

  let sql = `SELECT * FROM admins WHERE adminEmail='${email}'`;

  mysqlConnection.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    if (result.length === 0) {
      res.status(401).json({ msg: "Admin email Not Exists" });
    } else {
      bcrypt.compare(password, result[0].password, (err, response) => {
        if (response) {
          const user = { email: result[0].email, id: result[0].id };
          const token = jwt.sign(user, secretKey, { expiresIn: "1h" });
          res.status(200).json({ login: true, token });
        } else {
          res.status(401).json({ login: false, msg: "Wrong password" });
        }
      });
    }
  });
});

router.get("/profile", verifyToken, (req, res) => {
  res.json({ user: req.user });
});

function verifyToken(req, res, next) {
  const token = req.headers.token;

  if (!token) {
    return res.status(403).json({ error: "Access denied, token missing" });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = decoded;
    next();
  });
}

module.exports = router;