GV.product_types={"0":"Pannier surprise", "1":"Produit unique"};
// GV.supplier = supplier;


load_all().then(() => {					
    GV.supplier.content = typeof(GV.supplier.content) == "string" ? JSON.parse(GV.supplier.content) : GV.supplier.content;
    navigate_to("carts");
});

$(document).on('click','.header-button',function(){
    const {name} = $(this).data();
    navigate_to(name);
});

function navigate_to(page_name){
    $('.page').css('display','none');
    $('#'+page_name+'-page').css('display','block');
    $('.active-header-button').removeClass('active-header-button');
    $(`.header-button[data-name="${page_name}"]`).addClass('active-header-button');
    if(GV.functions[page_name] == undefined){return;}
    GV.functions[page_name]();
}



async function load_all(){
    try {
        let data = await ajax2( GV.base_url+'ajax/load_all', { supplier_id:GV.supplier.id});
        index_all(data);
    } catch (err) {
        $('.loading-container').append("<div style='color:red'>Une erreur s'est produite</div>");
        setTimeout(() => load_all(), 2000);
    }

       
}

async function load_orders(){
    try {
        let {id} = GV.supplier;
        let res = await ajax2(GV.base_url+'ajax_supplier/load_orders', {supplier_id: id});
        console.log(res);
        index_all(res);
    } catch (e) {
        console.error(e);
        $('.loading-container').append('<div style="color:red">Une erreur s\'est produite</div>');
        setTimeout(function(){ load_orders()}, 2000);
    }
}

function index_all(data){
    $.each(data, function(table_name, table_data){
        GV[table_name] = {};
        $.each(table_data, function(row_index, row){
            if(row['visibility']==-1){return true;}
            GV[table_name][row.id]=row;
            $.each(row, function(column_name, column_value){
                if(typeof(column_value) == "string"){                    
                    if(column_value[0] == '{' || column_value[0] == '['  ){
                        try{GV[table_name][row.id][column_name]=JSON.parse(column_value);}catch(e){}              
                    }
                }
            });
        });
    });
}


GV.functions.explore = async function(){
    await load_all();
    const all_suppliers = Object.values(GV.suppliers);
    const wholesellers = all_suppliers?.findBy('supplier_type','retailer', 'content');
    let html = '';
    for (seller of wholesellers){
        console.log(seller);
        html += `
        <div class="supplier-element" data-id="${seller.id}" >
            <div class="supplier-logo"><img src="./images/uploads/${seller.content?.logo}" alt="${seller.name}"></div>
            <div class="supplier-info">
                <div class="supplier-name">${seller.name}</div>
                
                <div class="gray">Boulanger</div>
                <div class="">21, Rue des frères Achour, Cheraga.</div>
            </div>
        </div>`;
    }
    $("#suppliers-container").html(html);
}


$(document).on('click','#explore-page .supplier-element', function() {
    GV.selected_seller = $(this).data("id");
    GV.functions.wholesellers();
});


GV.functions.wholesellers = function(){
    fade_panel($('#wholesellers-page'), true);
    const seller = GV.suppliers[GV.selected_seller];
    display_wholeseller(seller);
}


function display_wholeseller(seller){
    const products = Object.values(GV.products).findBy("supplier_id", seller.id);
    const product = products[0];
    let html=`<div class="product-element" data-id="${seller.id}">
                <div class="panel-content" style="position:relative;">
                    <div class="specific-product-top-actions  linear-top-black-background ">
                        <img style="float:right; height:30px;" src="${GV.base_url}images/heart-icon-white.png"/>      
                        <img class="close-panel" src="${GV.base_url}images/left-arrow-white.png"/>      
                    </div>
                    
                    <div class="product-image-container">
                        <img class="product-image" src="${GV.base_url}images/uploads/${seller.content?.logo}"/>                                    
                        <div class="product-element-title-container linear-black-background">
                            <div class="product-element-title">${seller.name}</div>
                        </div>
                    </div>
                    <div class="product-element-text">

                        <div class="product-distance padding5">
                            <img src="${GV.base_url}images/location-icon.png" style="width:20px; margin-right:7px;"/>
                            <div style="padding-top:3px;">123, Rue El Qods, Chéraga, Alger</div>
                        </div>

                    </div>`;
              
   
                    let temp = "";
                    for (let product of products){
                        temp += `
                            <div class="product-element center" style="margin-top:20px;"> 
                                <img src="${GV.base_url}images/uploads/${product.image}" style="width:100%; margin-bottom:20px;"/>
                                <div>${product.name}</div>
                            </div>`
                    }
                    const no_element = `<div class="center gray" style="margin-top:20px;">Aucun Elelment à afficher.</div>`;
                    html += `
                        <div class="title carousel-title" style="padding:5px 0px; padding-bottom:20px; font-size:18px;">LISTE DES PRODUITS</div>
                        <div id="products-list" >
                            ${temp == "" ? no_element : temp}
                        </div>`;

                    html += `<div id="supplier-information" style="margin:50px; 10px" >
                        <div class="title carousel-title" style="padding:5px 0px; padding-bottom:20px; font-size:18px;"><span>ADRESSE DE L'ETABLISSEMENT</span></div>
                        123, Rue El Qods, Chéraga, Alger         
                        <div class="center">
                            <div class="btn" style="background:#3858ab; margin-top:20px;">PARTAGER VIA FACEBOOK</div>
                        </div>
                    </div>
                    
                </div>
            </div>`;
        $('#wholesellers-page').html(html);
}



GV.functions.carts = async function(){
    await load_all();
    crm_display_carts();
    if ("android" in window){
        GV.token = window.android.getToken();
        console.log("got em", GV.token);
        ajax2(GV.base_url+'ajax/save_token', {id:GV.supplier.id, token:GV.token});
    } else console.log('fuck off, filthy desktop user!');

    requestLocationPermission();
    let {lat, lng} = await getLocation();
    console.log(`(${lat},${lng})`);
    GV.lati = lat;
    GV.longi = lng;
}


$(document).on('click','#crm-carts-filter .tab-button', function(){
    load_all().then(crm_display_carts);
});

function crm_display_carts(){
    let html="";
    let filter=''+$('#crm-carts-filter .active-tab-button').data('value');
    $.each(GV.orders, function(index, order){
        let user = GV.users[order.user_id];
        let product = GV.products[order.product_id];
        if (product == undefined) return;
        // console.assert(product!=undefined)
        if(user == undefined){return true;}
        let {phone_number} = (user?.content);
        if(filter !== "" && order.status != filter){return true;}
        html+=`<div class="product-element" data-id="${product.id}">
                <div class="product-element-left">
                    <img class="" src="${GV.base_url}images/uploads/${product.image || "product.png"}"/>
                </div
                ><div class="product-element-right">
                    <div class="bold">${user.name}</div>
                    <div>${phone_number}</div>
                    <div class="bold" style="margin-top:15px;">Panier Surprise</div>
                    <div class="gray">${moment(order.date).fromNow()}</div>
                    
                    <div class="bold main-color" style="margin-top:15px;">${order.code}</div>
                    
                </div>
            </div>`
    });
    if(html == ""){html=`<div style="padding:30px 0px;" class="gray">Aucun élément trouvé</div>`}
    $('#crm-carts-list').html(html);
}

GV.functions.products = function(){
    load_all().then(crm_display_products);
}

function display_categories_select(){
    var html=``;
    $.each(GV.categories, function(i,v){
        html+=`<option value="${v.id}">${v.name}</option>`;
    })
    
    $('#product-category').html(html).select2({ dropdownParent: $("#product-form"), width:'resolve'});
}


$(document).on('click','#products-filter .tab-button', function(){
    load_all().then(crm_display_products);
});



function crm_display_products(){
    let html="";
    let type = $('#products-page .active-tab-button').data('value');

        if(type == "products"){
            var add_btn = `<div id="new-product" class="btn"  style="width:80%; padding:15px; margin-top:10px; ">NOUVEAU PRODUIT</div>`;
            $.each(GV.products, function(_, product){
                if(product.supplier_id != GV.supplier.id){return;}
                const additional_class = expirationWarning(product.expiry);
                html=`<div class="product-element" data-id="${product.id}">
                        <div class="product-element-left">
                            <img class="" src="${GV.base_url}images/uploads/${product.image}"/>
                        </div
                        ><div class="product-element-right">
                            <div class="bold">${product.name}</div>
                            <div>${get_product_categories(product)}</div>
                            <div class="big_label">${product.price} DA</div>
                            <div><span class="bold">${product.stock}</span> en stock</div>
                            ${moment().diff(moment(product.expiry)) < 0 ? `<div>Expire le : <b class="${additional_class}"> ${moment(product.expiry).format("D MMM")}  </b> </div>` : `<span class="error bold">Expiré</span>`}
                        </div>
                        </div>${html}`;
            });
        }else{
            var add_btn = `<div id="new-basket" class="btn"  style="width:80%; padding:15px; margin-top:10px; ">NOUVEAU PANIER 🛒</div>`;
            $.each(GV.baskets, function(_, basket){
                const additional_class = expirationWarning(basket.expiry);
                html=`<div class="basket-element" data-id="${basket.id}">
                        ${basket.type == 1 ? `<img class="surprise-image" src="/images/surprise2.svg"/>` : ""}
                        <div class="basket-element-left">
                        <img class="" src="${GV.base_url}images/qoffa.svg"/>
                        </div

                        ><div class="product-element-right">
                            <div class="bold w150">${basket.name}</div>
                            <div class="bold c-orange5">${basket.products.length} produits</div> 
                            <div class="bold size32 c-green10">${basket.price} DA</div> 
                            <div>${basket.stock} en stock <br> Expire le <b class="${additional_class}">${moment(basket.expiry).format("DD MMMM")}</b></div>
                        </div>
                        </div>${html}`;
            });
        }



    if(html == ""){html=`<div style="padding:30px 0px;" class="gray">Aucun élément trouvé</div>`}
    html = add_btn + html;
    $('#crm-products').html(html);
}


function get_product_categories(product){
    let local_html = "";
    $.each(product.categories, function(_, category_id){
        if(local_html != ""){local_html+=", ";}
        local_html+=GV.categories[category_id].name;
    });
    return local_html;
}



$(document).on('click','#new-product', function(){
    reset_product_form();
});

function reset_product_form(){
    $('#product-form input').val('');
    $('#product-image-name').val('');

    $('#product-stock').text('0');
    $('#product-image-container').css('display','none');
    $('#product-upload-container').css('display','block');
    $('#delete-product').css('display','none');
    display_categories_select();
    fade_panel($('#product-form'), true);
}


$(document).on('click','#new-basket', function(){
    // fill_basket_product_select();
    display_basket_panel();
});

$(document).on('click','.basket-element', function(){
    const id = $(this).data("id");
    display_basket_panel(id);
});


function display_basket_panel(id){
    if (id){
        const basket = GV.baskets[id];
        const products = basket.products;
        fill_basket_product_select(products,  $("#basket-products"));
        $("#new-basket-panel .select-title").text("Contenu du panier:");
        $("#new-basket-panel .panel-title").text("MODIFIER LE PANIER");
        $("#basket-id").val(id);
        $("#basket-name").val(basket.name);
        $("#basket-type").val(basket.type);
        $("#basket-price").val(basket.price);
        $("#basket-stock").val(basket.stock);
        $("#basket-expiry").val(moment(basket.expiry).format("YYYY-MM-DD"))
        $("#delete-basket").show();
    }else{
        $("#save-basket-form input").each((_, i) => $(i).val(""));
        $("#basket-products").html(`<div class="gray" style="padding:25px 0px; text-align:center;">Ce panier est vide.</div><div id="add-products-to-basket" class="btn">Ajouter des produits</div>`)
        $("#delete-basket").hide();
    }
    fade_panel($('#new-basket-panel'), true);
}

function fill_basket_product_select(products, $selector){
    let pros, html = '';
    if(!$selector) $selector = $("#product-selection-list");
    if (products){
        pros = products.map(e => GV.products[e]);
        console.log(pros);
    }else{
        pros = Object.values(GV.products);
    }

    for (let pro of pros){
        if(pro.stock <1 ) continue;
        if (pro === undefined){
            html += `<div class="deleted-product"><div class="product-info">[Produit supprimé]</div></div>`  
        }else{
            html += `
                <div class="selectable-product" data-id="${pro.id}">
                    <div class="product-image"><img src="./images/uploads/${pro.image}" alt="${pro.name}"></div>
                    <div class="product-info">
                        <div class="size14">${pro.stock} en stock </br> </div>
                        <div class="bold size18">${pro.name} </div>
                            <div class="size14">Expire le ${moment(pro.expiry).format("DD MMM")}</div>
                    </div>
	                <img src="images/tick.svg" style="width:25px;">
                </div>`
        }
    }
    $selector.html(html);
}

$(document).on('click','#add-products-to-basket', function(){
    fill_basket_product_select();
    fade_panel($("#add-products-to-basket-panel"), true);
});

$(document).on('click','#confirm-basket-products', function(){
    const basket_products = [];
    $("#product-selection-list .selected-product").each(function(e) {
        basket_products.push($(this).data("id"));
    });
    console.log(basket_products);
    fill_basket_product_select(basket_products, $("#basket-products"));
    // $("#basket-products").html('');
    fade_panel($("#add-products-to-basket-panel"), false);
});

$(document).on('click','.selectable-product', function(){
    $(this).toggleClass("selected-product");
});

$(document).on('click','#new-basket-product', function(){
    reset_product_form();
});



$(document).on('click','#save-basket', async function(){
    const {valid, error} = check_basket();
    if(!valid) {$("#basket-save-error").text(error); return; }
    $("#basket-save-error").text("");
    let products = [];
    $("#product-selection-list .selected-product").each(function(){
        console.log($(this).data("id"));
        products.push($(this).data("id"));
    });

    let basket = {
        supplier_id : GV.supplier.id,
        name : $("#basket-name").val(),
        type : $("#basket-type").val(),
        price : $("#basket-price").val(),
        stock : $("#basket-stock").val(),
        products : JSON.stringify(products),
        expiry : $("#basket-expiry").val(),
    }

    let id = $("#basket-id").val()
    if (!(id == null || id == "")){
        basket.id = id;
    } 

    
    try {
        await ajax2(GV.base_url+'ajax/save_basket', {basket});
        fade_panel($('#new-basket-panel'), false);
        $('.header-button[data-name="products"]').click();
    } catch (err) {
        console.error(err);
        $("#basket-save-error").text("Une erreur s'est produite");
    }
});


function check_basket(){
    const name = $("#basket-name").val();
    const price = $("#basket-price").val();
    const qty = $("#basket-stock").val();
    const expiry = $("#basket-expiry").val();
    const products = $("#basket-products .selectable-product").length;
    let error, valid = true;
    console.log("hello errors");
    if(!name) {error="Veuillez ajouter un nom pour le panier"; valid=false;}
    if(!price) {error="Veuillez sélectionner le prix du panier"; valid=false;}
    if(!qty) {error="Veuillez ajouter le stock du panier"; valid=false;}
    if(!expiry) {error="Veuillez sélectionner une date d'expiration pour le panier"; valid=false;}
    if(products == 0) {error="Veuillez ajouter des produits au panier"; valid=false;}
    console.log("no errors");
    return {error, valid};
}

$(document).on('click','#delete-basket', function(){
    confirm_action('Voulez-vous vraiment supprimer ce panier ?', async function(){
        if($('#basket-id').val() ==""){return; }
        let id = $('#basket-id').val();
        try {
            let {error} = await ajax2('/ajax/delete_item', { id, table_name:"baskets"}); 
            delete GV.baskets[id];
            fade_panel($('#new-basket-panel'),false);
            $('.header-button[data-name="products"]').click();   
        } catch (err) {
            console.log(err);
            $('#basket-save-error').text("Une erreur s'est produite");
        }
    })
});



$(document).on('click','#products-page .product-element', function(){
    let product = GV.products[$(this).data('id')];
    $('#product-image').attr('src',''+GV.base_url+'images/uploads/'+product.image);
    $('#product-image-name').val(product.image);

    $('#product-id').val(product.id);
    $.each(product, (i,v) => $('#product-'+i).val(v));

    const status = product.published;
    status ? $('#product-published').addClass("on") : $('#product-published').removeClass("on");
    $('#product-published').data("value", status),
    $('#product-stock').text(product.stock);
    $('#product-expiry').val(moment(product.expiry).format('YYYY-MM-DD'));
    display_categories_select();
    const categories = (typeof product.categories == "string") ? JSON.parse(product.categories) : product.categories;
    $('#product-category').val(categories).trigger("change");

    
    $('#delete-product').css('display','inline-block');
    $('#product-image-container').css('display','block');
    $('#product-upload-container').css('display','none');
    fade_panel($('#product-form'), true);
});



$(document).on('click','.disponibility-btn', function(){
    var $parent= $(this).closest('.disponibility');
    var current_number= parseInt($parent.find('.disponibility-number').text());
    if($(this).data('action') == "minus"){
        var new_number=current_number-1;
        if(current_number <1){new_number=0;}
    
    }else{
        var new_number=current_number+1;
    }
    $parent.find('.disponibility-number').text(new_number);
});


$(document).on('click','#signup-logo-container', function(){
    GV.image_container= $('#signup-logo-container');
    $('.upload-image').click();
});

$(document).on('click','#product-image-container, #product-upload-container', function(){
    GV.image_container= $('#product-image-container');
    GV.image_type = "product";
    $('.upload-image').click();
});

$(document).on('click','#supplier-logo-container', function(){
    GV.image_container=$('#supplier-logo-container');
    GV.image_type = "supplier";
    $('.upload-image').click();
});

$(document).on('change','.upload-image', async function(){
    $('#product-image-container').css('display','block');
    $('#product-upload-container').css('display','none');
    $('#product-image-name').val('');

    const file = this.files[0];
    display_uploading_image(file, GV.image_container);
    let {file_name} = await uploadImage(file);
    console.log('%s uploaded successfuly: ', file_name);

    if (GV.image_type == "supplier"){GV.supplier.content.logo = file_name;}
});



function display_uploading_image(file, $image_container){
    if(file == undefined){return;}
    $image_container.find('img').attr('src',URL.createObjectURL(file));
    $image_container.find('.upload-progress').remove();
    $image_container.append('<div class="upload-progress" data-file_id="'+file.name+''+file.lastModified+'" >20%;</div>')
}

$(document).on('click','.switch', function(){
    let status = $(this).data("value");
    status === 0 ? $(this).data("value", 1) : $(this).data("value", 0);
    $(this).toggleClass("on");
});

$(document).on('click','#save-product', async function(){
    if(!check_form($(this))){return;};
    let product = {
        name:$('#product-name').val(), 
        stock:$('#product-stock').text(),
        categories:$('#product-category').val(),
        published:$('#product-published').data("value"), 
        price:$('#product-price').val(), 
        real_price:$('#product-real_price').val(), 
        supplier_id:GV.supplier.id,
        type:$('#product-type').val(),
        expiry:$('#product-expiry').val(),
        time:"00:00 - 23:00",
        description:$('#product-description').val()
    }
    if($('#product-id').val() !=""){product['id']=$('#product-id').val(); }

    if(  $('#product-image-name').val() == "" ){ $('#product-save-error').text("Upload de l'image toujours en cours"); return; }
    product['image'] = $('#product-image-name').val();

    try {
        let res = await ajax2(GV.base_url+'ajax/save_product', {product});
        console.log(res);
        GV.products[res.id] = res;
        fade_panel($('#product-form'), false);
        $('.header-button[data-name="products"]').click();
    } catch (err) {
        console.error(err);
        $('#product-save-error').text("Une erreur s'est produite");
    }
});


$(document).on('click','#delete-product', function(){
    confirm_action('Voulez-vous vraiment supprimer ce produit? Cette operation suprimera aussi tous les paniers contentant ce produit.', async function(){
        if($('#product-id').val() ==""){return; }
        let id = parseInt($('#product-id').val());
        try {
            let {error} = await ajax2('/ajax/delete_item', { id, table_name:"products"}); 
            delete GV.products[id];
            const baskets = [];
            // Optimize this
            for (let b of Object.values(GV.baskets)){
                if(b.products.includes(id)){
                    await ajax2('/ajax/delete_item', { id:b.id, table_name:"baskets"}); 
                }
            }
            console.log(baskets);
            fade_panel($('#product-form'),false);
            $('.header-button[data-name="products"]').click();   
        } catch (err) {
            console.log(err);
            $('#product-save-error').text("Une erreur s'est produite");
        }
    })
});



/////////////////////////////////////////////////////////////
////////////////////      PROFILE      /////////////////////////
/////////////////////////////////////////////////////////////

GV.functions.profile=function(){
    display_profile();
}

function display_profile(){
    let sup = {...GV.supplier, ...(GV.supplier.content)};
    $.each(sup, function(i,v){
        $('#profile-'+i).val(v);
    });
    $('#profile-points').text(GV.supplier.content.points || 0);
    $('#supplier-logo-container img').attr('src',GV.base_url+'images/uploads/'+(GV.supplier.content?.logo || "camera-icon-gray.png"));
    $('#supplier-logo-name').val(GV.supplier.content.logo);
    $("#order-count").text(`${Object.keys(GV.orders).length} Commandes`)
}


function getLocation() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition( (pos) => {
        let {latitude, longitude} = pos.coords;
        resolve({lat:latitude, lng:longitude});
      }, reject);
    });
}

  

async function requestLocationPermission(){
    if ("android" in window){ 
        android.getLocationPermission();
    }else{
        let {state} = await navigator.permissions.query({name:"geolocation"});
        if (state != "granted") alert("Please allow location access");
    }
}



$(document).on('click','#save-profile', async function(){
    if(!check_form($(this))){return;};
    let {lati, longi} = GV;
    let supplier = {
        id:GV.supplier.id,
        name:$('#profile-name').val(),
        email:$('#profile-email').val(),
        content: {
            phone_number:$('#profile-phone_number').val(),
            logo: $('#supplier-logo-name').val(),
            points:$('#profile-points').text(),
            address:$('#profile-address').val(),
            lati,
            longi
        }
    }
    
    if ("android" in window) supplier.content.token = GV.token ;
    // if (GV.lat != undefined) supplier.content.lati = GV.lat ;
    // if (GV.lng != undefined) supplier.content.longi = GV.lng ;

    supplier.content = JSON.stringify(supplier.content);

    console.log(supplier.content);
    if($('#profile-password').val() != ""){supplier['password']=$('#profile-password').val();}

    if(  $('#supplier-logo-name').val() == "" ){ $('#save-profile-error').text('Upload de l\'image toujours en cours'); return; }

    let res = await ajax2( GV.base_url+'ajax/save_profile', {supplier});
    if(res.error){
        console.log(res.error);
    }else{
        // GV.supplier = res['supplier'];
        $('.header-button[data-name="profile"]').click();
    }
});




/////////////////////////////////////////////////////////////
////////////////////      LOGIN      /////////////////////////
/////////////////////////////////////////////////////////////


$(document).on('click', '#supplier-disconnect', function(){
    confirm_action('Voulez-vous vraiment vous déconnecter ?', async() => {
        const lang = window.localStorage?.lang;
        window.location.replace(`disconnect?lang=${lang||"fr"}`);
    });
});