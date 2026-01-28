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
	
let folderPath = path.join(__dirname,"public","images")
fs.rmSync(folderPath, {recursive: true, force: true});
fs.mkdirSync(folderPath);
console.log("Cleared images folder");

query("DROP DATABASE IF EXISTS `face-recognition`");
query("CREATE DATABASE `face-recognition`");
query("USE `face-recognition`");
query("CREATE TABLE RegisteredUsers (name VARCHAR(255) UNIQUE, email VARCHAR(255) UNIQUE)");
query("CREATE TABLE FaceRecognitionResults (accuracy DECIMAL(5,2))");
query("CREATE TABLE Archive (date VARCHAR(255) UNIQUE)")
.then(()=>{
	console.log("Hard reset successful");
	pool.end();
});