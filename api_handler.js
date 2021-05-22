const router = require('express').Router();
const E = require('http-errors');
const db = require('./db.js');
const fn = require('./functions.js');
const moment = require('moment');
const {BASE_URL, MAPS_API_KEY} = require('./config');


const api = {};

api.load_all = async (req, res, next, data) => {
	let {supplier_id} = data, result = {};
	try{
		//db operation error
		// await db.niggas();
		}catch(e){
			return next(E(501));
		}

		if(supplier_id){
		result = {
			categories : await db.select('*', 'categories'),
			products : await db.select('*', 'products',{supplier_id, deleted:0}),
			baskets : await db.select('*', 'baskets', {supplier_id, deleted:0}),
			suppliers : await db.select('*', 'users',{type: "supplier" ,deleted:0}),
			orders : await db.select('*', 'orders', {supplier_id, deleted:0}),
		}
		
		let user_ids = {};
		// check whether this can be done using SQL
		for (let o of result.orders) user_ids[o.user_id] = true;

		const users = await db.select('*', 'users', {type:"user"});

		result['users'] = users.filter((u) => user_ids[u.id]);
		
	}else{
		return next(E(400, "Supplier ID not specified"));
	}
	
	return result;
};


api.load_products = async (req, res, next, data) => {
		// throw new Error("Hello");
		const db_suppliers = await db.select('*','users', {type:"supplier", deleted : 0, active: 1});
		const db_products = await db.exec_query("SELECT * FROM products WHERE deleted = 0 AND published = 1 AND stock > 0  ORDER BY date DESC"); 
		const products = {}, suppliers = {};
		const lati = parseFloat(data.lati);
		const longi = parseFloat(data.longi);
		
		const range = 0.1; // 0.1 =~ 9Km
		for (const supplier of db_suppliers){
			const content = JSON.parse(supplier.content);
			let {lati:supplier_lat, longi:supplier_lng} = content || {};
			const distance = Math.sqrt(Math.pow((supplier_lat-lati),2) + Math.pow((supplier_lng-longi),2));
			console.log(supplier.name , distance);
			if(distance > range) continue;
			suppliers[supplier.id] = {...supplier, distance};
		};

		for (const product of db_products){
			if(suppliers[product.supplier_id] == undefined ) continue;
			product.distance = suppliers[product.supplier_id].distance;
			products[product.id] = product;
		};

		return {suppliers, products};
}


api.save_item = async (req, res, next, data) => {
	let {item, table} = data;
	if(!item.id){
		let {insertId} = await db.insert(table, item);
		item.id = insertId;
	}else{
		await db.update(table, item, {id:item.id});
	}

	return {[table] : await db.select('*',table, {id :item.id})};
}


api.delete_item = async (req, res, next, data) => {
	await db.update(data.table_name, {deleted:1}, {id:data.id});
	return {deleted : data.id};
}


api.save_user = async (req, res, next, data) => {
	let {item } = data;
	if(!item.id){
		let {insertId} = await db.insert("users", item);
		item.id = insertId;
	}else{
		await db.update("users", item, {id:item.id});
	}
	return {"user" : await db.select('*', "users", {id :item.id})};
}


api.update_user = async (req, res, next, data) => {
	await db.update('users', data.user, {id:data.user.id});
	return {success: true};
}


api.delete_user = async (req, res, next, data) => {
	return {"deleted" : await db.update("users", {deleted:1, active: -1}, {id: data.id})};
}


api.save_token = async (req, res, next, data) => {
	let {id, token} = data
	let user = await db.select('*', 'users', {id}, "row");
	let content = JSON.parse(user.content) || {};
	content.token = token;
	return await db.update('users', {content}, {id});
}


api.save_profile = async (req, res, next, data) => {
	let {supplier} = data;
	let {id, content} = supplier;
	let {content: db_content} = await db.select('content', "users", {id},"row");
	supplier.content = {...JSON.parse(db_content), ...JSON.parse(content)};
	return await db.update('users', supplier, {id});
}


api.save_product = async (req, res, next, data) => {
	let {product} = data;
	if(!product.id){
		let {insertId} = await db.insert("products", product);
		product.id = insertId;
	}else{
		await db.update("products", product, {id:product.id});
	}
	return await db.select('*', "products", {id :product.id}, "row");
}


api.save_basket = async (req, res, next, data) => {
	let {basket} = data;
	if(!basket.id){
		let {insertId} = await db.insert("baskets", basket);
		basket.id = insertId;
	}else{
		await db.update("baskets", basket, {id:basket.id});
	}
	return await db.select('*', "baskets", {id :basket.id});
}

api.load_orders = async (req, res, next, data) => {
	const {user_id, supplier_id} = data;

	const orders = (user_id) ?
	await db.select('*', 'orders', {user_id, deleted:0}) :
	await db.select('*', 'orders', {supplier_id, deleted: 0});

	const products = [], suppliers = [];
	for (let order of orders){
		const product = await db.select('*', 'products', {id:order.product_id}, "row");
		if(product) products.push(product);
		const supplier = await db.select('*', 'users', {id:order.supplier_id}, "row")
		if(supplier) suppliers.push(supplier);
	}

	return {orders, products, suppliers};
}


api.load_baskets = async (req, res, next, data) => {
	const today = moment().format("YYYY-MM-DD");
	const db_baskets = await db.exec_query(`SELECT * FROM baskets WHERE deleted = 0 AND stock > 0  AND expiry > "${today}" ORDER BY date DESC`);
	const baskets = {};
	for (let basket of db_baskets) baskets[basket.id] = basket;
	return {baskets};
}


api.save_order = async(req, res, next, data) => {
	let {order} = data;
	order.status = order.status || 0;
	await db.insert('orders', order);
	let product = await db.select('*','products',{id:order.product_id}, 'row');
	let stock = parseInt(product.stock) - order.quantity;
	await db.update('products', {stock}, {id:order.product_id});
	let supplier = await db.select('*','users',{id:order.supplier_id}, 'row');
	return await notifySupplier(order, product, supplier)
}


api.change_order_status = async(req, res, next, data) => {
	await db.update('orders', {status:data.status}, {id:data.order_id});
}


api.search_products = async(req, res, next, data) => {
	let {key} = data;
	return await db.exec_query(`SELECT * FROM products WHERE name LIKE "%${key}%" AND deleted = 0`, "indexed");
}


api.forgotten_password = async(req, res, next, data) => {
	let {email} = data;
	try {
		const {sendEmail} = require('./mailer');
		console.log("sending");
		const link = encodeURI(`${BASE_URL}reset_password?email="${email}"&token=123456789`);
		const html = `<h3>Cliquez sur le lien suivant pour réinitialiser votre mot de passe:<h3>
						<b><a href="${link}">Réinitialiser</a></b>`;
		return await sendEmail({to:email, subject:"Password Reset", html });
	} catch (error) {
		console.error("Oh shi-");
		return {error};
	}
}


api.reset_password = async(req, res, next, data) =>{
	const {email, password} = data;
	try {
		await db.update("users", {password}, {email});
		result["success"] = true;
	} catch (error) {
		console.error("Oh shi-");
		return {error};
	}
}


router.post(`/:id`, async (req, res, next) => {
	let result = {};
	let func_name = req.params.id;
	let data = req.body;	
	
	try{
		console.log(`----${func_name}----`);

		if (func_name in api){
			const result = await api[func_name](req, res, next, data);
			return res.send(result);
		}else{
			return next(E(404, "endpoint does not exist on this server!"));
		}

		res.send(result);

	}catch(error){
		console.error(error.message);
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

// Universal erro handler
router.use(function(err, req, res, next) {
	const debug = true;
	console.log("------ [ERROR] ----");
	console.log(err.status, ": ", err.message);
	res.status(err.status || 500);
	res.send({error:err.message, stack: debug ? err.stack : {}});
	// next();
});

module.exports = router;