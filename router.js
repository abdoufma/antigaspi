const {join, resolve, basename} = require('path');
const router = require('express').Router();
const db = require('./db.js');
const fn = require('./functions.js');
const upload = require('./upload.js');
const fetch = require('node-fetch');
const moment = require('moment');
const MAPS_API_KEY = 'AIzaSyA3kg7YWugGl1lTXmAmaBGPNhDW9pEh5bo';

router.get(`/all`,  async (req, res, next) => {
	const {code, lang} = req.query;
	let fb_user = {};
	try {
		if(code){
			let bu = fn.get_bu(req);
			fb_user = await fn.get_facebook_sdk_user(code, bu);
			// if(fb_user == {} || fb_user == undefined){throw new Error(`BU: ${fb_user}`);}
			let db_user = await db.select('*','all_users', {email:fb_user.email}, "row");
			let categories = await db.select('*','categories', {}, 'indexed');
			if(db_user){
				req.session.user_id = db_user.id;
				fn.render(req, res, "main", {user:db_user, categories}, lang);
			}else{
				let {insertId} = await db.insert("all_users", {...fb_user, type:"user"});
				req.session.user_id = insertId;
				fn.render(req, res, "main", {user:fb_user, categories}, lang);
			}
		}

		if(req.session.user_id){
			let {user_id} = req.session;
			let user = await db.select('*', "all_users", {id:user_id}, "row");
			if(user == undefined){return res.send("<h2>User not found<h2>")}
			switch (user.type) {
				case "user": fn.render(req, res, "main", {user, categories: await db.select('*','categories', {}, 'indexed')}, lang);  break;
				case "admin": fn.render(req, res, "admin", {user}, lang); break;
				case "supplier": fn.render(req, res, "supplier", {supplier:user}, lang); break;
				default: res.redirect("/disconnect"); break;
			}
		}else{
			fn.render(req, res, "login", {}, lang);
		}
	} catch (err) {
		res.status(500).json({fb_user, error:err.message, stack:err.stack});
	}
});


router.get(`/maps`,  async (req, res, next) => {
	const {lat, lng} = req.query;
	const response = await fetch(`https://maps.googleapis.com/maps/api/staticmap?zoom=20&size=800x500&maptype=roadmap&key=${MAPS_API_KEY}&center=${lat},${lng}&markers=color%3Ared%7C${lat},${lng}`);
    const buffer = await response.buffer();
	res.contentType("image/png").send(buffer);
});

router.get(`/admin`,  async (req, res, next) => {
	if(!await fn.authenticate(req, res, "admin")){ return; }
	fn.render(req, res, "admin",{admin:req.user});
});

router.get(`/tos`, async (req, res) => {
	fn.render(req, res, "tos");
});


router.post(`/uploads`, upload.single('file'), (req, res, next) => {
	const file_name = basename(req.file.path);
	console.log(req.file);
	res.json({file_name});
});


router.post(`/signup`, async (req, res, next) => {
	return fn.signup(req,res);
});

router.post(`/login`, async (req,res) => {
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


router.get(`/push`, async (req,res) => {
	fn.render(req, res, "notifications");
});

router.get(`/firebase-messaging-sw.js`, (_,res) => res.sendFile(resolve(__dirname, "public/js", "firebase-messaging-sw.js")));


router.post(`/ajax/:id`, async (req, res, next) => {
	let result = {};
	let func_name = req.params.id;
	let data = req.body;	
	
	try{
		console.log(`----${func_name}----`);
		if(func_name == 'load_all'){
			let {supplier_id} = data;
			if(supplier_id != "0"){
				result['categories'] = await db.select('*', 'categories');
				result['products'] = await db.select('*', 'products',{supplier_id, deleted:0});
				result['baskets'] = await db.select('*', 'baskets', {supplier_id, deleted:0});
				result['suppliers'] = await db.select('*', 'all_users',{type: "supplier" ,deleted:0});
				result['orders'] = await db.select('*', 'orders', {supplier_id, deleted:0});
				let users_ids = {};
				db.foreach(result['orders'], function(i,v){
					users_ids[v.user_id] = true;
				})
		
				let users = await db.select('*', 'all_users', {type:"user"});
				result['users'] = [];

				users.forEach((u) => {
					if(users_ids[u.id] == undefined){return;}
					result['users'].push(u);
				});

			}else{
				result['categories'] = await db.select('*', 'categories',{type:'!-1', deleted:0});
				result['products'] = await db.select('*', 'products',{deleted:0});
				result['orders'] = await db.select('*', 'orders',{deleted:0});
				result['baskets'] = await db.select('*', 'baskets', {supplier_id, deleted:0});
				result['users'] = await db.select('*', 'all_users',{type: "user" , deleted:0}, null, 100);
				result['suppliers'] = await db.select('*', 'all_users',{type: "supplier" ,deleted:0});
			}
		}


		if(func_name == 'save_item'){
			let {item, table} = data;
			if(!item.id){
				let {insertId} = await db.insert(table, item);
				item.id = insertId;
			}else{
				await db.update(table, item, {id:item.id});
			}
			result[table]=await db.select('*',table, {id :item.id});
		}

		if(func_name == 'save_user'){
			let {item } = data;
			if(!item.id){
				let {insertId} = await db.insert("all_users", item);
				item.id = insertId;
			}else{
				await db.update("all_users", item, {id:item.id});
			}
			result["user"] = await db.select('*', "all_users", {id :item.id});
		}


		if(func_name == 'delete_item'){
			await db.update(data.table_name, {deleted:1}, {id:data.id});
			result["deleted"]=data.id;
		}

		if(func_name == 'delete_user'){
			let {id} = data
			result["deleted"] = await db.update("all_users", {deleted:1, active: -1}, {id});
		}

		
		if(func_name == 'update_user'){
			let user = JSON.parse(data.user);
			let res = await db.update('all_users', user, {id:user.id});
			console.log({res});
		}

		if(func_name == 'save_token'){
			let {id, token} = data
			let user = await db.select('*', 'all_users', {id}, "row");
			let content = JSON.parse(user.content) || {};
			content.token = token;
			result = await db.update('all_users', {content}, {id});
		}

		
		if(func_name == 'save_profile'){
			let {supplier} = data;
			let {id, content} = supplier;
			let {content: db_content} = await db.select('content', "all_users", {id},"row");
			supplier.content = {...JSON.parse(db_content), ...JSON.parse(content)};
			await db.update('all_users', supplier, {id});
		}


		if(func_name == 'save_product'){
			let {product} = data;
			if(!product.id){
				let {insertId} = await db.insert("products", product);
				product.id = insertId;
			}else{
				await db.update("products", product, {id:product.id});
			}
			result = await db.select('*', "products", {id :product.id});
		}
		
		if(func_name == 'save_basket'){
			let {basket} = data;
			if(!basket.id){
				let {insertId} = await db.insert("baskets", basket);
				basket.id = insertId;
			}else{
				await db.update("baskets", basket, {id:basket.id});
			}
			result = await db.select('*', "baskets", {id :basket.id});
		}

		if(func_name == 'load_orders'){
            const {user_id, supplier_id} = data;

		    result['orders'] = (user_id) ?
            await db.select('*', 'orders', {user_id, deleted:0}) :
            await db.select('*', 'orders', {supplier_id, deleted: 0});
		}

		if(func_name == 'load_baskets'){
			const today = moment().format("YYYY-MM-DD");
			const db_baskets = await db.exec_query(`SELECT * FROM baskets WHERE deleted = 0 AND stock > 0  AND expiry > "${today}" ORDER BY date DESC`);
			const baskets = {};
			for (let basket of db_baskets) baskets[basket.id] = basket;
			result['baskets'] = baskets;
		}



		if(func_name == 'save_order'){
			let {order} = data;
			order.status = order.status || 0;
			await db.insert('orders', order);
			let product = await db.select('*','products',{id:order.product_id}, 'row');
			let stock = parseInt(product.stock) - order.quantity;
			await db.update('products', {stock}, {id:order.product_id});
			let supplier = await db.select('*','all_users',{id:order.supplier_id}, 'row');
			result = await notifySupplier(order, product, supplier)
		}


		if(func_name == 'change_order_status'){
			await db.update('orders', {status:data.status}, {id:data.order_id});
		}


		if(func_name == 'load_products'){
			const db_suppliers = await db.select('*','all_users', {type:"supplier", deleted : 0, active: 1});
			const db_products = await db.exec_query("SELECT * FROM products WHERE deleted = 0 AND published = 1 AND stock > 0  ORDER BY date DESC"); 
			const products = [], suppliers = {};
			let lati = parseFloat(data.lati);
			let longi = parseFloat(data.longi);
			
			const range = 0.1; // ~ 9Km
			for (const supplier of db_suppliers){
				const content = JSON.parse(supplier.content);
				let {lati:lat, longi:lng} = content || {};
				if(!is_between(parseFloat(lat), lati -range, lati + range)) continue;
				if(!is_between(parseFloat(lng), longi -range, longi + range)) continue;
				suppliers[supplier.id] = supplier;
			};

			for (const product of db_products){
				if(suppliers[product.supplier_id] == undefined ) continue;
				products.push(product);
			};

			result = {suppliers, products};


		}


		if(func_name == 'search_products'){
			let {key} = data;
			result = await db.exec_query(`SELECT * FROM products WHERE name LIKE "%${key}%" AND deleted = 0`, "indexed");
		}



		if(func_name == 'forgotten_password'){
			let {email} = data;
			try {
				const {sendEmail} = require('./mailer');
				console.log("sending");
				const link = encodeURI(`http://localhost/reset_password?email="${email}"&token=123456789`);
				const html = `<h3>Cliquez sur le lien suivant pour réinitialiser votre mot de passe:<h3>
								<b><a href="${link}">Réinitialiser</a></b>`;
				result = await sendEmail({to:email, subject:"Password Reset", html });
			} catch (error) {
				console.error("Oh shi-");
				result = {error};
			}
		}

		if(func_name == 'reset_password'){
			const {email, password} = data;
			try {
				await db.update("all_users",{password},{email});
				result["success"] = true;
			} catch (error) {
				console.error("Oh shi-");
				result = {error};
			}
		}

		res.send(result);

	}
	catch(error){
		console.error(error);
		res.status(500).json({error:error.message, stack:error.stack});
	}
});



function notifySupplier(order, product, {content}) {             
	let {token} = JSON.parse(content);
	if(token==undefined) return ; //throw new Error("Invalid token");
	let title = "Nouvelle commande";
	let body = `Vous avez une commande pour ${order.quantity} ${product.name}`;
	return fn.send_notification(title, body, token);
}



const is_between = (num, min, max) => num > min && num < max;


module.exports = router;