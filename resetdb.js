const mysql = require('mysql');

const db = mysql.createConnection({ host:"localhost",user:"root",password:"",database:"face-recognition"});
	
db.connect(err=>{
	db.query(`DELETE FROM registeredUsers`,(err,res)=>{
		if (err) return;
		console.log(res);
	});

	db.end();
})