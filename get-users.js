let mysql = require('mysql');
let util = require("util");

require("dotenv").config();

let pool = mysql.createPool({
	connectionLimit: 1,
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME
});
let query = util.promisify(pool.query).bind(pool);

query(`SELECT * FROM RegisteredUsers`)
.then(data=>{
	console.log(data);
	pool.end();
});