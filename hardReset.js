const mysql = require('mysql');
const path = require('path');
const fs = require('fs');

const connection = mysql.createConnection({host:"localhost",user:"root",password:""});
	
function multiQuery(db,queryList,cb) {
	for (let idx = 0; idx < queryList.length; idx++) {
		let i = queryList[idx];
		db.query(i,(err,res)=>{
			if (err) return;
			if (cb) cb(idx,err,res);
		})
	}
}

connection.connect(err=>{
	//clear images
	let folderPath = path.join(__dirname,"public","images")
	fs.rmSync(folderPath, {recursive: true, force: true});
	fs.mkdirSync(folderPath);
	console.log("Cleared images folder");
	
	//reset database
	multiQuery(connection,[
		"DROP DATABASE IF EXISTS `face-recognition`",
		"CREATE DATABASE `face-recognition`",
		"USE `face-recognition`",
		"CREATE TABLE RegisteredUsers (name VARCHAR(255) UNIQUE, time TEXT)",
		"CREATE TABLE Archive (date VARCHAR(255) UNIQUE)",
	],(idx,err,res)=>{
		if (err) console.error(err);
	});
	
	console.log("Hard reset successful");

	connection.end();
})
