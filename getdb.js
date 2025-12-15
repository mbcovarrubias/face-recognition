const mysql = require('mysql');

const db = mysql.createConnection({ host:"localhost",user:"root",password:"",database:"face-recognition"});
	
db.connect(err=>{
	db.query(`SELECT * FROM registeredUsers`,(err,res)=>{
		if (err) return;
		console.log(res.map((i)=>{
			return { name: i.name };
		}));
	});

	db.end();
})