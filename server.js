let express = require("express");
let bodyParser = require("body-parser");
let path = require("path");
let fs = require("fs");
let mysql = require("mysql");
let util = require("util");
let qrcode = require("qrcode");
let http = require("http");
let WebSocket = require("ws");
require("dotenv").config();

let pool = mysql.createPool({
	connectionLimit: process.env.CONNECTION_LIMIT,
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME
});

let qrCodeOptions = {width: 300, margin: 2};
let wsClients = [];

let query = util.promisify(pool.query).bind(pool);
let saveLoc = "public/images/faces";
let port = process.env.PORT;

let app = express();
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json({limit: '50mb'}));

let server = http.createServer(app);
let wss = new WebSocket.WebSocketServer({ server });

wss.on('connection', ws => {
	console.log('Client connected')
	wsClients.push(ws);
	
	ws.on('close', ()=>wsClients.splice(wsClients.indexOf(ws)));
	ws.on('error', console.error);
});

app.post("/", async (req,res) => {
	try {
		let action = req.body.action ?? "";
		let message = req.body.message ?? {};
		let name = req.body.name;
	
		switch (action.toLowerCase()) {
			case "check username":
				let alreadyExists = false;
				let users = await query(`SELECT * FROM RegisteredUsers`);
				users = users.map(user=>user.name.toLowerCase());
				if (users.indexOf(message.toLowerCase()) != -1) alreadyExists = true;
				res.send({alreadyExists});
				
				break;
			case "capture": {
				let fileName = message.fileName;
				let content = message.content;
				
				let b64 = content.split(";base64,").pop();
				let buffer = Buffer.from(b64,"base64");
				let imgPath = path.join(__dirname,saveLoc,fileName+".jpg");
				
				fs.writeFile(imgPath,buffer,err=>{
					if (err) res.json({ status: 'failed', message: err });
					else res.json({ status: 'success', message: 'Successfully created file' });
				});
				break;
			} case "reset captures":
				if (!message.nextClicked) {
					let count = 0;
					for (let i = 0; i < message.captureCount; i++) {
						let imgPath = path.join(__dirname,saveLoc,`${message.user}_${i}.jpg`);
						if (fs.existsSync(imgPath)) {
							fs.rmSync(imgPath);
							count++;
						}
					}
					if (count > 0) console.log(`Successfully removed ${count} images of registering user: ${message.user}`);
				}
				break;
			case "get registered users":
				let registeredUsers = await query(`SELECT * FROM RegisteredUsers`);
				res.send(registeredUsers.map(i=>i.name));
				break;
			case "user exists in record": {
				try {
					let record = await query(`SELECT * FROM \`${message.date}\``);
					record = record.map(row=>row.name.toLowerCase());
					res.send({exists: record.indexOf(message.name.toLowerCase()) != -1});
				} catch {
					res.send({exists: false});
				}
				break;
			} case "face recognized":
				if (!message.date.match(/^\d{4}-\d{2}-\d{2}$/)) return; // prevent sql injection
			
				await query(`CREATE TABLE IF NOT EXISTS \`${message.date}\` (name VARCHAR(255) UNIQUE, time TEXT)`);
				
				let list = await query(`SELECT * FROM \`${message.date}\``);
				let names = list.map((row)=>row.name);
				if (!message.unknown && names.indexOf(message.name) == -1) {
					await query(`INSERT INTO \`${message.date}\` (name, time) VALUES (?, ?) ON DUPLICATE KEY UPDATE time = VALUES(time)`,[message.name, message.time]);
					await query(`INSERT INTO Archive (date) VALUES (?) ON DUPLICATE KEY UPDATE date=date`,[message.date]);
					
					let record = await query(`SELECT * FROM \`${message.date}\``);
					
					res.send({created: true, message: `Added '${message.name}' to current record`,printToLogs: true});
					
					wsClients.forEach(client=>{
						if (client.readyState == WebSocket.OPEN) client.send(JSON.stringify(record));
					})
				} else {
					res.send({created: false, printToLogs: false});
				}
				
				break;
		}
	} catch (err) {
        console.error("Internal Server Error:", err);
	}
})

app.get("/registration",(req,res)=>{
	res.render("registration");
})

app.post("/registration",async (req,res)=>{
	if (!req.body.action) return;
	let name = req.body.name;
	let action = req.body.action.toLowerCase();
	
	if (action == "camera") {
		res.render("registration2",{name});
	} else if (action == "regfinish") {
		let responseData = {success: false, message: "Registration failed"};
		try {
			await query(`INSERT INTO RegisteredUsers (name) VALUES (?)`,[name])
			console.log("Successfully registered user: "+name);
			responseData = {success: true, message: "Registration successful"};
		} catch {
			console.log("An error occured when registering user: "+name);
		} finally {
			wsClients.forEach(client=>{
				if (client.readyState == WebSocket.OPEN) client.send("");
			})
			res.render("regfinish",responseData);
		}
	}
})

app.get("/verification",(req,res)=>{
	res.render("verification");
})

app.get("/home",(req,res)=>{
	res.render("home",require("./package.json"));
})

app.get("/qr",async(req,res) => {
	let qrCodes = {};
	try {
		let url1 = await qrcode.toDataURL("https://"+req.headers.host+"/registration",qrCodeOptions);
		let url2 = await qrcode.toDataURL("https://forms.gle/gczGuNcUgXmD8v1MA",qrCodeOptions);
		
		qrCodes.Registration = url1;
		qrCodes["Evaluation Survey"] = url2;
		qrCodes = JSON.stringify(qrCodes)
		
		res.render("qr",{qrCodes});
	} catch (err) {
		console.error(err);
	}
})

app.get("/record",async(req,res)=>{
	let q = req.query;
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
		
	} finally {
		res.render("record",renderData);
	}
})

app.get("/archive",async (req,res)=>{
	let dates = [];
	try {
		let archive = await query(`SELECT * FROM Archive`);
		for (let i = 0; i < archive.length; i++) {
			let date = archive[i].date;
			let present;
			try {
				present = await query(`SELECT * FROM \`${date}\``);
				present = present.length;
			} catch (err) {
				present = "Error";
			} finally {
				dates.push({date, present});
			}
		}
	} catch (err) {
		console.error(err);
	}
	res.render("archive",{dates:JSON.stringify(dates)});
})

server.listen(port,()=>console.log(`Server is running on http://localhost:${port}`));
