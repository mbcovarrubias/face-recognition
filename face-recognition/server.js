const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const mysql = require('mysql');

const app = express();

app.set("view engine","ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());

app.post("/", (req,res) => {
	const formData = req.body
	res.render("camera",{ formData });
})

app.post("/getRegisteredUsers", (req,res) => {
	const db = mysql.createConnection({ host:"localhost",user:"root",password:"",database:"face-recognition"});
	
	db.connect(err=>{
		db.query(`SELECT * FROM registeredUsers`,(err,registeredUsers)=>{
			if (err) return;
			
			res.send(registeredUsers.map((i)=>{
				return i.name;
			}));
		});

		db.end();
	})
})

app.post("/checkUsername",(req,res)=>{
	const db = mysql.createConnection({ host:"localhost",user:"root",password:"",database:"face-recognition"});
	const formData = req.body
	let alreadyExists = false;
	
	db.connect(err=>{
		db.query(`SELECT * FROM registeredUsers`,(err,registeredUsers)=>{
			if (err) return;
			for (let i = 0; i < registeredUsers.length; i++) {
				if (formData.name.toLowerCase() == registeredUsers[i].name.toLowerCase()) {
					alreadyExists = true;
					break;
				}
			}
			
			res.send({"alreadyExists": alreadyExists});
		});

		db.end();
	})
});

app.post("/capture", (req,res) => {
	const { fileName, content } = req.body;
	const base64Data = content.split(";base64,").pop();
	const b = Buffer.from(base64Data,"base64");
	const p = path.join(__dirname,"public","images",fileName+".jpg");
	
	fs.writeFile(p,b,(err) => {
		if (err) {
			res.json({ status: 'failed', message: err });
		} else {
			res.json({ status: 'success', message: 'Successfully created file' });
		}
	})
})

function multiQuery(db,queryList,cb) {
	let idx = 0;
	queryList.forEach((i)=>{
		db.query(i,(err,res)=>{
			if (err) return;
			if (cb) cb(idx,err,res);;
			idx++;
		})
	});
}

app.post("/regfinish", (req,res) => {
	const db = mysql.createConnection({ host: 'localhost',user: 'root',password: '', });
	const formData = req.body

	db.connect(err=>{
		const dbName = "`face-recognition`";
		multiQuery(
			db,
			[
				`CREATE DATABASE IF NOT EXISTS ${dbName}`,
				`USE ${dbName}`,
				`CREATE TABLE IF NOT EXISTS registeredUsers (name TEXT)`,
				`INSERT INTO registeredUsers (name) VALUES ('${formData.name}')`,
				`SELECT * FROM registeredUsers`
			],
			(idx,err,res)=>{
				if (idx == 4) {
					res.forEach((i)=>{
						console.log(i.name);
					});
				}
			}
		);

		db.end();
	})
	res.render("regfinish",{ formData });
})

app.listen(3000);