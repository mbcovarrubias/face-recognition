const mysql = require('mysql');
const path = require('path');
const fs = require('fs');

const db = mysql.createConnection({ host:"localhost",user:"root",password:"",database:"face-recognition"});
	
db.connect(err=>{
	db.query(`DELETE FROM registeredUsers`,(err,res)=>{
		if (err) return;
		
		//clear images
		const directory = path.join(__dirname,"public","images")
		fs.readdir(directory, (err, files) => {
			if (err) throw err;

			for (const file of files) {
				fs.unlink(path.join(directory, file), (err) => {
					if (err) throw err;
				});
			}
		});
		
		console.log("Cleared users",res);
	});

	db.end();
})