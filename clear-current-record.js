const mysql = require('mysql');
const path = require('path');
const fs = require('fs');

const db = mysql.createConnection({ host:"localhost",user:"root",password:"",database:"face-recognition"});
	
function multiQuery(db,queryList,cb) {
	for (let idx = 0; idx < queryList.length; idx++) {
		let i = queryList[idx];
		db.query(i,(err,res)=>{
			if (err) return;
			if (cb) cb(idx,err,res);
		})
	}
}

db.connect(err=>{
	let pad = (n) => n.toString().padStart(2,"0");
	
	let now = new Date();
	let year = now.getFullYear();
	let month = pad(now.getMonth()+1);
	let day = pad(now.getDate());
	
	let formattedDate = `${year}-${month}-${day}`;
	
	multiQuery(
		db,
		[
			`DROP TABLE IF EXISTS \`${formattedDate}\` `,
		],
		(idx,err,res)=>{
			if (err) console.error(err);
			console.log(res);
		}
	);

	db.end();
})