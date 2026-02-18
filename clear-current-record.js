// import {createRequire} from "module";
// let require = createRequire(import.meta.url);

let mysql = require('mysql');
let path = require('path');
let fs = require('fs');
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
let pad = (n) => n.toString().padStart(2,"0");
	
let now = new Date();
let year = now.getFullYear();
let month = pad(now.getMonth()+1);
let day = pad(now.getDate());

let formattedDate = `${year}-${month}-${day}`;

query(`DROP TABLE IF EXISTS \`${formattedDate}\``)
.then(()=>{
	query(`DELETE FROM Archive WHERE date=\`${formattedDate}\``)
	.then(()=>{
		console.log("Cleared current record");
		pool.end();
	});
});
