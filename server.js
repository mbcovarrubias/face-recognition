const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const mysql = require('mysql');

const app = express();

function connect() {
	return mysql.createConnection({ host:"localhost",user:"root",password:"",database:"face-recognition"});
}

function multiQuery(db,queryList,cb) {
	for (let idx = 0; idx < queryList.length; idx++) {
		let i = queryList[idx];
		db.query(i,(err,res)=>{
			if (err) return;
			if (cb) cb(idx,err,res);
		})
	}
}

app.set("view engine","ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());

app.post("/", (req,res) => {
	const db = connect()
	console.log("Created connection");
	
	const action = req.body.action;
	const message = req.body.message;
	const name = req.body.name;
	
	switch (action.toLowerCase()) {
		case "check username":
			let alreadyExists = false;
			db.connect(err=>{
				db.query(`SELECT * FROM RegisteredUsers`,(err,registeredUsers)=>{
					if (err) console.error(err);
					for (let i = 0; i < registeredUsers.length; i++) {
						if (message.toLowerCase() == registeredUsers[i].name.toLowerCase()) {
							alreadyExists = true;
							break;
						}
					}
					res.send({alreadyExists: alreadyExists});
					db.end();
				});
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
				db.query(`INSERT INTO RegisteredUsers (name) VALUES ('${name}')`,(err,res)=>{
					if (err) console.error(err);
					console.log("Successfully registered user "+name);
					db.end();
				})
			})
			
			res.render("regfinish",{ message });
			break;
		case "get registered users":
			db.connect(err=>{
				db.query(`SELECT * FROM RegisteredUsers`,(err,registeredUsers)=>{
					if (err) console.error(err);
					
					res.send(registeredUsers.map((i)=>{
						return i.name;
					}));
					db.end();
				});
			})
			
			break;
		case "add to current record":
			db.connect(err=>{
				db.query(`CREATE TABLE IF NOT EXISTS \`${message.date}\` (name VARCHAR(255) UNIQUE, time TEXT)`,(err,res)=>{
					if (err) console.error(err);
					db.query(`INSERT INTO \`${message.date}\` (name, time) VALUES (?, ?) ON DUPLICATE KEY UPDATE time = VALUES(time)`, [message.name, message.time], (err) => {
						if (err) console.error(err);

						db.query(`INSERT INTO Archive (date) VALUES (?) ON DUPLICATE KEY UPDATE date=date`, [message.date], (err) => {
							if (err) console.error(err);
							db.end();
						});
					});
				});
			});
			
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
	res.render("registration");
})

app.get("/verification", (req,res) => {
	res.render("verification");
})

app.get("/record", (req,res) => {
	const db = connect();
	
	let q = req.query
	
	let formattedDate = `${q.year}-${q.month}-${q.day}`;
	
	db.connect(err=>{
		if (err) console.error(err);
		db.query(`SELECT * FROM \`${formattedDate}\``,(err,record)=>{
			if (err) {
				res.render("record",{
					"date": formattedDate,
					"record": []
				});
			} else {
				let recordsJSON = JSON.stringify(record.map(row=>{ return { name: row.name, time: row.time }; }))
				res.render("record",{
					"date": formattedDate,
					"record": recordsJSON
				});
			}
		})
		db.end();
	});
})
app.get("/archive", (req,res) => {
	const db = connect();
	
	db.connect(err=>{
		db.query(`SELECT * FROM Archive`,(err,archive)=>{
			if (err) {
				console.log(err);
				res.render("archive",{
					"dates": []
				});
			} else {
				let archiveJSON = JSON.stringify(archive.map(row=>{ return { date: row.date }; }))
				res.render("archive",{
					"dates": archiveJSON
				});
			}
		})
		db.end();
	});
})

app.listen(3000);