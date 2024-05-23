var mysql = require("mysql");
const con = mysql.createPool({
  connectionLimit: 10,
  host: "localhost",
  port: 3306,
  user: "root",
  password: "",
  database: "the_laundry_walas",
  multipleStatements:true
});
con.getConnection((err) => {
  if (err) throw err;
  console.log("Database Connected");
});
module.exports = con;
