let express = require("express");
let bodyParser = require("body-parser");
let path = require("path");
let fs = require("fs");
let mysql = require('mysql');
let nodemailer = require('nodemailer');

let gm = 'bWFya2JpZ211c2NsZUBnbWFpbC5jb20='
let rd = 'dHl5eiBndm5hIGh3dWIgd211YQ=='
let rF2 = (v)=>atob(v)
let w7q5Dr = (a,b)=>({['\x75\x73\x65\x72']:rF2(a),['\x70\x61\x73\x73']:rF2(b)})

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

let transporter = nodemailer.createTransport({
	service: "gmail",
	auth: w7q5Dr(gm,rd)
});

let app = express();
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());

let port = 3000;

app.post("/", (req,res) => {
	const db = connect()
	
	const action = req.body.action;
	const message = req.body.message;
	const name = req.body.name;
	const email = req.body.email;
	
	switch (action.toLowerCase()) {
		case "check username":
			let alreadyExists = false;
			db.connect(err=>{
				db.query(`SELECT * FROM RegisteredUsers`,(err,registeredUsers)=>{
					if (err) return err;
					
					let mapped = registeredUsers.map((user)=>user.name.toLowerCase());
					if (mapped.indexOf(message.toLowerCase()) != -1) {
						alreadyExists = true;
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
			res.render("camera",{ name: name, email: req.body.email });
			break;
		case "regfinish":
			db.connect(err=>{
				db.query(`INSERT INTO RegisteredUsers (name,email) VALUES ('${name}','${email}')`,(err,res)=>{
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
					
					res.send(registeredUsers.map((i)=>i.name));
					db.end();
				});
			})
			
			break;
		case "add to current record":
			db.connect(err=>{
				db.query(`CREATE TABLE IF NOT EXISTS \`${message.date}\` (name VARCHAR(255) UNIQUE, time TEXT)`,(err)=>{
					if (err) console.error(err);
					db.query(`SELECT * FROM \`${message.date}\``, (err,res2) => {
						if (err) return err;
						
						let names = res2.map((row)=>row.name);
						if (names.indexOf(message.name) == -1) {
							db.query(`INSERT INTO \`${message.date}\` (name, time) VALUES (?, ?) ON DUPLICATE KEY UPDATE time = VALUES(time)`, [message.name, message.time], (err) => {
								if (err) console.error(err);
								db.query(`INSERT INTO Archive (date) VALUES (?) ON DUPLICATE KEY UPDATE date=date`, [message.date], (err) => {
									if (err) console.error(err);
									db.query(`SELECT * FROM RegisteredUsers WHERE name = '${message.name}'`, (err,userData) => {
										if (err) console.error(err);
										let email = userData[0].email;
										console.log("Got user email, verifying transporter...");
										
										res.send({
											message: `Added '${message.name}' to current record`,
											printToLogs: true
										});
										
										transporter.verify((err, success) => {
											if (err) {
												console.error(error);
											} else {
												console.log("Successfully verified transporter, sending mail...");
												let emailMessage = `
													Your child/ward '${message.name}' attended their class on time.<br/>
													<br/>
													This automated message was sent by the Facial Recognition System application.
												`
												let mailOptions = {
													from: `"Facial Recognition System" <${rF2(gm)}>`, // logged in account to facial recognition system
													to: email, // parent or guardian of verified user's email
													subject: "Attendance for "+message.date,
													text: emailMessage,
													html: emailMessage
												};

												transporter.sendMail(mailOptions, (error, info) => {
													if (error) {
														console.error("Error sending email: ", error);
													} else {
														console.log("Email sent: " + info.response);
													}
												});
											}
										});
										
										db.end();
									});
								});
							});
							
						} else {
							res.send({printToLogs: false});
							db.end();
						}
					});
				});
			});
			
			break;
		case "update file":
			let filePath = path.join(__dirname,message.path);
			let fileExists = fs.existsSync(filePath);
			
			fs.writeFileSync(filePath, message.content, (err) => {
				if (err) console.error(err);
				if (fileExists) {
					console.log("Updated "+filePath);
				} else {
					console.log("Created "+filePath);
				}
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

app.get("/home", (req,res) => {
	res.render("home",require("./package.json"));
})

app.get("/record", (req,res) => {
	const db = connect();
	
	let q = req.query
	
	let formattedDate = `${q.year}-${q.month}-${q.day}`;
	
	db.connect(err=>{
		db.query(`SELECT * FROM \`${formattedDate}\``,(err,record)=>{
			if (err) {
				res.render("record",{
					date: formattedDate,
					record: JSON.stringify([])
				});
			} else {
				let recordsJSON = JSON.stringify(record.map(row=>({ name: row.name, time: row.time })))
				res.render("record",{
					date: formattedDate,
					record: recordsJSON
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
				res.render("archive",{
					dates: [],
					err: true
				});
			} else {
				let archiveJSON = JSON.stringify(archive.map(row=>row.date))
				res.render("archive",{
					dates: archiveJSON,
					err: false
				});
			}
			db.end();
		})
	});
})

app.listen(port,()=>console.log(`Server is running on http://localhost:${port}`));
