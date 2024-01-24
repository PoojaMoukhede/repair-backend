
const mysql = require("mysql2");

const mysqlConnection = mysql.createConnection({
  host: "localhost",
  port: "3306",
  user: "root",
  password: "pooja@123MCIPL",
  // database: "repair",
  database: "repair2",

});

mysqlConnection.connect((err) => {
  if (err) {
    console.log("Error in DB connection: " + JSON.stringify(err, undefined, 2));
  } else {
    console.log('DB connected successfully');
  }
});

module.exports = mysqlConnection;
