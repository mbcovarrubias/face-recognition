const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const mysql = require('mysql');

const app = express();

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

app.set("view engine","ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());

app.post("/", (req,res) => {
	const db = mysql.createConnection({ host:"localhost",user:"root",password:"",database:"face-recognition"});
	
	const action = req.body.action;
	const message = req.body.message;
	const name = req.body.name;

	switch (action.toLowerCase()) {
		case "check username":
			let alreadyExists = false;
			db.connect(err=>{
				db.query(`SELECT * FROM registeredUsers`,(err,registeredUsers)=>{
					if (err) return;
					for (let i = 0; i < registeredUsers.length; i++) {
						if (message.toLowerCase() == registeredUsers[i].name.toLowerCase()) {
							alreadyExists = true;
							break;
						}
					}
					res.send({alreadyExists: alreadyExists});
				});
				db.end();
			})
			break;
		case "capture":
			const fileName = message.fileName;
			const content = message.content;
			
			const base64Data = content.split(";base64,").pop();
			const b = Buffer.from(base64Data,"base64");
			const p = path.join(__dirname,"public","images",fileName+".jpg");
			
			fs.writeFile(p,b,(err) => {
				if (err) {
					res.json({ status: 'failed', message: err });
				} else {
					res.json({ status: 'success', message: 'Successfully created file' });
				}
			});
			break;
		case "camera":
			res.render("camera",{ name });
			break;
		case "regfinish":
			db.connect(err=>{
				db.query(`INSERT INTO registeredUsers (name) VALUES ('${name}')`,(err,registeredUsers)=>{return});
				db.end();
			});
			res.render("regfinish",{ message });
			break;
		case "get registered users":
			db.connect(err=>{
				db.query(`SELECT * FROM registeredUsers`,(err,registeredUsers)=>{
					if (err) return;
					
					res.send(registeredUsers.map((i)=>{
						return i.name;
					}));
				});

				db.end();
			})
			break;
		default:
			break;
	}
})

app.post("/submit1", (req,res) => {
	const formData = req.body
	res.render("camera",{ formData });
})

app.get("/registration", (req,res) => {
	res.render("registration",{});
})

app.get("/verification", (req,res) => {
	res.render("verification",{});
})

app.get("/current-record", (req,res) => {
	
})
app.get("/archive", (req,res) => {
	
})

app.listen(3000);