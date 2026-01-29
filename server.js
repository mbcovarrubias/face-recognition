let express = require("express");
let bodyParser = require("body-parser");
let path = require("path");
let fs = require("fs");
let mysql = require('mysql');
let nodemailer = require('nodemailer');
let util = require("util");
let { spawn } = require('child_process');

require("dotenv").config();

let port = process.env.PORT;
let pool = mysql.createPool({
	connectionLimit: process.env.CONNECTION_LIMIT,
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME
});
let query = util.promisify(pool.query).bind(pool);

let transporter = nodemailer.createTransport({service: "gmail",auth: {user: process.env.AUTH_USER,pass: process.env.AUTH_PASS}});

let app = express();
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json({limit: '50mb'}));

app.post("/", async (req,res) => {
	let action = req.body.action ?? "";
	let message = req.body.message ?? {};
	let name = req.body.name;
	let email = req.body.email;
	
	try {
		switch (action.toLowerCase()) {
			case "check username":
				let alreadyExists = false;
				let users = await query(`SELECT * FROM RegisteredUsers`);
				users = users.map((user)=>user.name.toLowerCase());
				if (users.indexOf(message.toLowerCase()) != -1) alreadyExists = true;
				
				res.send({alreadyExists: alreadyExists});
				
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
			case "reset captures":
				if (!message.nextClicked) {
					for (let i = 0; i < message.captureCount; i++) {
						let imgPath = path.join(__dirname,"public","images",`${message.user}_${i}.jpg`);
						if (fs.existsSync(imgPath)) {
							fs.rmSync(imgPath);
						}
					}
				}
				break;
			case "camera":
				res.render("camera",{ name: name, email: req.body.email });
				break;
			case "regfinish":
				await query(`INSERT INTO RegisteredUsers (name,email) VALUES (?,?)`,[name,email]);
				console.log("Successfully registered user "+name);
				
				res.render("regfinish",{ message });
				break;
			case "get registered users":
				let registeredUsers = await query(`SELECT * FROM RegisteredUsers`);
				res.send(registeredUsers.map(i=>i.name));
				break;
			case "get average accuracy":
				let accuracyData = await query("SELECT * FROM FaceRecognitionResults");
				accuracyData = accuracyData.map(row=>row.accuracy);
				
				let length = accuracyData.length;
				if (length > 0) {
					let averageAccuracy = (accuracyData.reduce((a,b)=>a+b)/length).toFixed(2);
					res.send({"accuracy":`${averageAccuracy}%`});
				} else {
					res.send({"accuracy":"N/A"});
				}
				break;
			case "face recognized":
				if (!message.date.match(/^\d{4}-\d{2}-\d{2}$/)) return; // prevent sql injection
			
				await query(`CREATE TABLE IF NOT EXISTS \`${message.date}\` (name VARCHAR(255) UNIQUE, time TEXT)`);
				await query(`INSERT INTO FaceRecognitionResults (accuracy) VALUES (?)`,[message.accuracy])
				
				let list = await query(`SELECT * FROM \`${message.date}\``);
				let names = list.map((row)=>row.name);
				if (!message.unknown && names.indexOf(message.name) == -1) {
					await query(`INSERT INTO \`${message.date}\` (name, time) VALUES (?, ?) ON DUPLICATE KEY UPDATE time = VALUES(time)`,[message.name, message.time]);
					await query(`INSERT INTO Archive (date) VALUES (?) ON DUPLICATE KEY UPDATE date=date`,[message.date]);
					
					let userData = await query(`SELECT * FROM RegisteredUsers WHERE name = ?`,[message.name]);

					let email = userData[0].email;
					console.log("Got user email, verifying transporter...");
					
					res.send({message: `Added '${message.name}' to current record`,printToLogs: true});
					
					transporter.verify((err, success) => {
						if (err) throw err;
						
						console.log("Successfully verified transporter, sending mail...");
						
						let emailMessage = `
							Your child/ward '${message.name}' attended their class on time.<br/>
							<br/>
							This automated message was sent by the Facial Recognition System application.
						`
						let mailOptions = {
							from: `"Facial Recognition System" <${process.env.AUTH_USER}>`, // logged in account to facial recognition system
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
					});
					
				} else {
					res.send({printToLogs: false});
				}
				
				break;
			default:
				break;
		}
	} catch (err) {
        console.error("Database Error:", err);
        res.status(500).send("Internal Server Error");
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

app.get("/home",(req,res) => {
	res.render("home",require("./package.json"));
})

app.get("/record",async(req,res)=>{
	let q = req.query
	let formattedDate = `${q.year}-${q.month}-${q.day}`;
	
	let renderData = {
		date: formattedDate,
		record: JSON.stringify([]),
		embedded: req.query.embedded ?? false
	};
	
	try {
		let record = await query(`SELECT * FROM \`${formattedDate}\``);
		renderData.record = JSON.stringify(record.map(row=>({ name: row.name, time: row.time })));
	} catch {
		
	}
	res.render("record",renderData);
})
app.get("/archive",async(req,res)=>{
	try {
		let archive = await query(`SELECT * FROM Archive`);
		archive = archive.map(async(row)=>{
			let recordData = await query(`SELECT * FROM \`${row.date}\``);
			return {date: row.date, present: recordData.length};
		});
		archive = await Promise.all(archive);
		archive = JSON.stringify(archive);
		
		res.render("archive",{dates: archive, err: false});
	} catch {
		res.render("archive",{dates: JSON.stringify([]), err: true});
	}
})

app.listen(port,()=>console.log(`Server is running on http://localhost:${port}`));