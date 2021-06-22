//@ts-check
const db = require('./db.js');
const fs = require('fs');
const {createHmac} = require("crypto");
const request = require('request');
const path = require('path');
const base_url = path.join(__dirname,'public/');
const https = require('https');
const fcm_server_key = "AAAA0DAm3nM:APA91bGQaePMKOsvT-ClU7bv1a1xVqUlzFsc7gQm1kTVkpajocntBhu-8JioVd0K-_UjcpoFct0EdHYstgNJlJYpxSnxJ5WG8JdrP5MSdcBMvwD0bSa1Zbe_9EtMqABP5S0bt94B7v7L";

const fn = {};
const tl = require("./translations.json");
const {SECRET_KEY} = require("./config");

fn.render = (req, res, file, variables, lang) => {
	let file_content = fs.readFileSync(`${base_url+file}.html`).toString();  
	file_content = translate(file_content, lang);
	if(variables == undefined){variables={};}
	if(variables.base_url == undefined){variables.base_url=`"${fn.get_bu(req)}"`;}
    res.send(`${fn.variables_script(variables)} ${file_content}`);
}

function translate(html, lang){
	lang = lang || "fr";
	let regex = new RegExp(/\{\{\s*(.*?)\s*\}\}/g);
	// console.log({matches:html.match(regex)});
	if(html.match(regex) == null) return html;
	html.match(regex).forEach((i)=>{
		try{
		  let index = (i).replace('{{','').replace('}}','');
		//   console.log('replacing %s with "%s" ', i, tl[lang][index]);
		  html = html.replace(i, tl[lang][index]);
		}catch(e){console.error('Error while translating page: \n', e);
		}
	});
	return html;
  }

fn.variables_script = (variables) => {
    let html="let GV = {};";
    db.foreach(variables, function(i, v){
        if (typeof v == "object"){v = JSON.stringify(v);}
        html+=` GV["${i}"] = ${v}; `;
    });
    return `<script>${html}</script>`;
}

  
fn.get_bu = function(req){
    var host=req.headers.host;
    if(host.indexOf("localhost") != -1) {return `http://${req.headers.host}/`; }
    return `https://${req.headers.host}/` ;
}


fn.store_session_id = function  (req, user, table_name){
	if(user == undefined){return;}
	req.session.user_id=user.id;
	req.session.table_name=table_name;
}
 
fn.authenticate = async function  (req, res, user_type) {	
	let user = await fn.get_logged_user(req);
	if(!user) {
		delete req.user;
		fn.redirect_to_login(req, res, req.originalUrl); 
		return false;
	}
	if(user_type === 'admin' && user.type !== "admin") {
		delete req.user;
		fn.redirect_to_login(req, res, req.originalUrl); 
		return false;
	}
	req.user = user;
	return true;
};

fn.redirect_to_login = function(req, res, url){
    fn.render(req, res, "login");
}

fn.get_logged_user = async function(req){
	if(req.query.code){
		let bu = fn.get_bu(req);
		let fb_user = await fn.get_facebook_sdk_user(req.query.code, bu);
		// await fn.fb_login(req, fb_user) // find user or create it if not exists
		return fb_user;
	}
	if((!req.session.user_id)) return null;
	let user = await db.select('*', "users", {id:req.session.user_id}, "row");
	return user;
}

fn.fb_login = async function(req, user){
	if(user == undefined){return false;}
	let db_user = await db.select('*', "users", { email:user.email},'row');
	console.log({found_in_db:db_user});
	
	if(db_user){
		user = db_user;
	}else{
		let {insertId} = await db.insert("users", user);
		user = await db.select('*', "users", {id:insertId},'row');
	}
	
	req.session.user_id = user.id;
	return true;
}

fn.get_facebook_sdk_user= async function(code, bu){
	try{
		let app_id="387635348411174";
		let secret="72602a5ca8863182d66068a7908ae9a8";
		let redirect_uri=bu+"all";
		let data = await fn.get_json(`https://graph.facebook.com/v5.0/oauth/access_token?client_id=${app_id}&redirect_uri=${redirect_uri}&client_secret=${secret}&code=${code}`);
		let data2 = await fn.get_json(`https://graph.facebook.com/oauth/access_token?client_id=${app_id}&client_secret=${secret}&grant_type=client_credentials`);
		let data3 = await fn.get_json(`https://graph.facebook.com/debug_token?input_token=${data.access_token}&access_token=${data2.access_token}`);
		let fb_user = await fn.get_json(`https://graph.facebook.com/${data3.data.user_id}?fields=id,name,email&access_token=${data.access_token}`);
		return {name:fb_user.name, email:fb_user.email, fb_id:fb_user.id};
	}catch(e){
		return undefined;
	}	
}

fn.get_json = function (path){
    return new Promise(function(resolve, reject) {
		let str="";
		const my_req = https.request(path, (res) => {
			res.setEncoding('utf8');
			res.on('data', (chunk) => str+=chunk);

			res.on('end', () => {
				console.log({str});
				try{resolve(JSON.parse(str));}
				catch(e){resolve(undefined);}
			});		
		});

		my_req.on('error', reject);
		
		my_req.end();
    });    

}

fn.signup = async function (req, res){
	let {user} = req.body;
	try {
		user = ( typeof(user) == "string" ) ? JSON.parse(user) : user;
		let existing_user = await db.select('*', "users", {email:user.email}, 'row');
		
		if(existing_user){
			res.send({error:"Ce compte existe déjà."});
		}else{ // new user
			console.log("reading content...");
			let content = typeof(user.content) == "string" ? JSON.parse(user.content) : user.content;
			if(!(content.lati && content.longi)){
				content.lati = 36.7532; content.longi = 3.06908;
				user.content = JSON.stringify(content)
			}
			let {insertId} = await db.insert("users", user);
			user = await db.select('*', "users", {id:insertId},'row');
			if(user.type == "supplier"){
				notify_admin(user);
			}
		}
	
		req.session.user_id = user.id;
		return res.send({user});
			
	} catch (error) {
		console.log(error);
		return res.status(500).send({error:error.message});
	}
}

// BKP
// fn.login = async function(req, res){
// 	let {table_name, email, password} = req.body;		
// 	let user = await db.select('*', table_name, {email, password}, 'row');
// 	fn.store_session_id(req, user, table_name);
// 	res.send({user});	
// }


fn.login = async function(req, res){
	let {email, password} = req.body;		
	try {
		const user = await db.select('*', "users", {email}, 'row');	
		// let user = await db.select('*', "users", {email, password}, 'row');	
        if(user){
            if(verify_password(password, user.hashed_password)){
                if(user.active === -1){
					res.status(403).send({error:"Ce Compte à été banni par l'administateur du site."});
				}else{
					req.session.user_id = user.id;
					res.send({user});	
				}
            }else{
				// Wrong Password
                res.status(400).send({error:"Identifiants invalides"});
            }
        }else{
			// no user found
            console.log("user not found");
			res.status(400).send({error:"Identifiants invalides"});
        }


	} catch (err) {
			console.error(err);
			res.status(500).json({error:err});
	}
}


async function hash_password(password){
    return createHmac('sha256', SECRET_KEY).update(password).digest('hex');
}

function verify_password(password, hash){
    const hashed_password = createHmac('sha256', SECRET_KEY).update(password).digest('hex');
    return hashed_password === hash;
}




fn.send_notification = function(title, body, token, image){
	let payload = { 
		priority: "HIGH",
		data: { title, body, image : image || "https://img.icons8.com/bubbles/2x/purchase-order.png" },
		to: token
	}

    const options = {   
			url:'https://fcm.googleapis.com/fcm/send',
			body:payload,
			headers:{'Authorization': `key=${fcm_server_key}`},
			json: true
	}; 

	return new Promise( (resolve, reject) => {
		request.post(options, (err, res, _body) => {
			if (err) return reject(err);
			if (res.statusCode < 300)
				resolve(_body)
			else 
				reject(_body)
		});
    });
}

async function notify_admin(user){
	const admin = await db.select("*","users", {type:"admin"},"row");
	const {token} = JSON.parse(admin.content);
	let title = "Un nouveau fournisseur vient de rejoindre Antigaspi";
	let body = `${user.name} vient de rejoindre Antigaspi`;
	await fn.send_notification(title, body, token);
}

module.exports = fn;
