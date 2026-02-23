let mysql = require('mysql');
let path = require('path');
let fs = require('fs');
let util = require("util");

require("dotenv").config();

(async()=>{
	let pool = mysql.createPool({
		connectionLimit: 1,
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
	});
	let query = util.promisify(pool.query).bind(pool);

	let folderPath = path.join(__dirname,"public","images","faces");
	fs.rmSync(folderPath, {recursive: true, force: true});
	fs.mkdirSync(folderPath);
	console.log("Cleared faces folder");

	folderPath = path.join(__dirname,"public","test_images");
	fs.rmSync(folderPath, {recursive: true, force: true});
	fs.mkdirSync(folderPath);
	console.log("Cleared test images folder");

	try {
		await query("DROP DATABASE IF EXISTS `face-recognition`");
		await query("CREATE DATABASE `face-recognition`");
		await query("USE `face-recognition`");
		//await query("CREATE TABLE RegisteredUsers (name VARCHAR(255) UNIQUE, email VARCHAR(255))");
		await query("CREATE TABLE RegisteredUsers (name VARCHAR(255) UNIQUE)");
		//query("CREATE TABLE FaceRecognitionResults (accuracy DECIMAL(5,2))");
		await query("CREATE TABLE Archive (date VARCHAR(255) UNIQUE)");
		
		console.log("Hard reset successful");
		pool.end();
	} catch (err) {
		console.error(err);
	}
})();
