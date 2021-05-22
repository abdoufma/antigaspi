const {join, resolve, basename} = require('path');
const router = require('express').Router();
const db = require('./db.js');
const fn = require('./functions.js');
const upload = require('./upload.js');
const apiHandler = require('./api_handler');
const fetch = require('node-fetch');
const {BASE_URL, MAPS_API_KEY} = require('./config');
const { readFileSync } = require('fs');


router.post(`/uploads`, upload.single('file'), (req, res, next) => {
	const file_name = basename(req.file.path);
	console.log(req.file);
	res.json({file_name});
});


router.get(`/all`,  async (req, res, next) => {
	const {code, lang} = req.query;
	let fb_user = {};
	try {
		if(code){
			let bu = fn.get_bu(req);
			fb_user = await fn.get_facebook_sdk_user(code, bu);
			// if(fb_user == {} || fb_user == undefined){throw new Error(`BU: ${fb_user}`);}
			let db_user = await db.select('*','users', {email:fb_user.email}, "row");
			let categories = await db.select('*','categories', {}, 'indexed');
			if(db_user){
				req.session.user_id = db_user.id;
				fn.render(req, res, "main", {user:db_user, categories}, lang);
				// res.render("main", {db_user: JSON.stringify(db_user), categories, message: "hello"}, (err) => {
				// 	console.log(err);
				// });
			}else{
				let {insertId} = await db.insert("users", {...fb_user, type:"user"});
				req.session.user_id = insertId;
				fn.render(req, res, "main", {user:fb_user, categories}, lang);
			}
		}

		if(req.session.user_id){
			let {user_id} = req.session;
			let user = await db.select('*', "users", {id:user_id}, "row");
			if(user == undefined){return res.send("<h2>User not found<h2>")}
			switch (user.type) {
				// case "user": fn.render(req, res, "main", {user, categories: await db.select('*','categories', {}, 'indexed')}, lang);  break;
				case "user": 
					const categories = await db.select('*','categories', {}, 'indexed');
					res.render("main", {user: JSON.stringify(user), categories: JSON.stringify(categories)});  
				break;
				case "admin": fn.render(req, res, "admin", {user}, lang); break;
				case "supplier": fn.render(req, res, "supplier", {supplier:user}, lang); break;
				default: res.redirect("/disconnect"); break;
			}
		}else{
			const tl = require("./translations.json");
			// fn.render(req, res, "login", {}, lang);
			res.render("login", tl["fr"]);
		}
	} catch (err) {
		res.status(500).json({fb_user, error:err.message, stack:err.stack});
	}
});


router.get(`/admin`,  async (req, res, next) => {
	if(!await fn.authenticate(req, res, "admin")){ return; }
	fn.render(req, res, "admin",{admin:req.user});
});


router.get(`/tos`, async (req, res) => {
	res.render("tos", {message: "done!"});
});


router.post(`/signup`, async (req, res, next) => {
	return fn.signup(req,res);
});

router.post(`/login`, async (req,res) => {
	console.log("loggin in...")
	await fn.login(req,res);
});


router.get(`/disconnect`, async (req, res, next) => {
	delete req.session.user_id;
	let {lang} = req.query;
	lang = (lang == "null" || lang == "undefined") ? "fr" : lang
	console.log({lang});
	res.redirect(`/all?lang=${lang || "fr"}`);
});

router.get(`/reset_password`, async (req, res, next) => {
	const {email, token} = req.query;
	if (!token){}
	fn.render(req, res, "reset", {email, invalid: true});
});

router.get(`/firebase-messaging-sw.js`, (_,res) => res.sendFile(resolve(__dirname, "public/js", "firebase-messaging-sw.js")));


router.use("/api", apiHandler);


module.exports = router;