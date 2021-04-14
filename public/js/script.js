GV.longi = 3.0100658000000067;
GV.lati = 36.7574811;
GV.place_name = "Adresse non spécifiée";
GV.fcm_server_key = "AAAA0DAm3nM:APA91bGQaePMKOsvT-ClU7bv1a1xVqUlzFsc7gQm1kTVkpajocntBhu-8JioVd0K-_UjcpoFct0EdHYstgNJlJYpxSnxJ5WG8JdrP5MSdcBMvwD0bSa1Zbe_9EtMqABP5S0bt94B7v7L"
GV.selected_big_category = undefined;
GV.sort_dir = true;


$(document).on('click','.header-button',function(){
    init_page($(this).data('name'));
});

function init_page(name){
    let $button = $(`.header-button[data-name="${name}"]`);
    $('.page').css('display','none');
    if (name === "main"){
        $('#main-page').css('display','flex');
    }else{
        $('#'+name+'-page').css('display','block');
    }
    $('.active-header-button').removeClass('active-header-button');
    $button.addClass('active-header-button');
    display_header_history_count();
    if(GV.functions[name] == undefined){return;}
    GV.functions[name]();
}



$(document).on('click','#map-position-btn', async function(){
    await requestLocationPermission();
    console.log("getting user location");
    const {lat, lng} = await getLocation();
    console.log("Got em: ", lat, lng);
    GV.map.setCenter({lat, lng});
    const place_name = await get_formatted_place_name(lat, lng);
    console.log(place_name);
    set_place_name(place_name);
});

$(document).on('click','#logo',function(){
    if ("android" in window){
        window.android.postMessage("Hello from Javascript!");
    } else console.log('fuck off, filthy desktop user!');
});



//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
////////////////////////      MAIN      //////////////////////////
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////


GV.functions.main = async function(){
    search_for_products();
    display_categories(true);
}

function display_categories(hide){
    let html="";
    $.each(GV.categories, function(index, category){
        if(category.type != 1){return true;}

        html+='<div class="main-category" data-id="'+category.id+'">'
                +'<div class="main-category-content">'
                    +'<div class="main-category-icon">'
                        +'<img src="./images/'+category.image+'"/>'
                    +'</div>'
                    +'<div class="main-category-title">'+category.name+'</div>'
                    // +'<div class="main-category-title arabic-name">'+category.arabic_name+'</div>'
                    +'<div class="main-category-subtitle">'+category.sub_title+'</div>'
                +'</div>'
            +'</div>';
    });
    $('#main-categories').html(html);
    if(!hide){
        $('#main-categories-panel').css('display','block');
    }
 
}

$(document).on('click','#filter-btn', function(){
    fade_panel($('#main-categories-panel'),true);
});

$(document).on('click','#sort-btn', function(){
    // fade_panel($('#filter-panel'),true);
    sort_products();
});

function sort_products(){
    GV.sort_dir = !GV.sort_dir;
    GV.sort_dir ? $("#sort-btn img").addClass("flipped") : $("#sort-btn img").removeClass("flipped");
    display_products();
}

$(document).on('click','.main-category', function(){
    fade_panel($('#main-categories-panel'),false);
    GV.selected_big_category = $(this).data('id').toString();
    $('#category-title').text(GV.categories[GV.selected_big_category].name).css('display','none').fadeIn();
    search_for_products();
});

$(document).on('click','#reset-filters', function(){
    GV.selected_big_category = undefined;
    search_for_products();
    fade_panel($('#main-categories-panel'),false);
});


$(document).on('click','#save-map', function(){
    // init_page("main");
});


async function search_for_products(){
    $('#products-container').html(loading_html());
    try{
        let data = await ajax2(GV.base_url+'ajax/load_products', { lati:GV.lati, longi:GV.longi});
        GV.products = {}; GV.suppliers = {}; GV.carts = {};
        
        $.each(data['products'], function(i,v){
            try{v.categories = JSON.parse(v.categories); }catch(e){}
            GV.products[v.id] = v;
        });

        $.each(data['suppliers'], (i,v) => GV.suppliers[v.id] = v); 
        // $.each(data['carts'], (i,v) => GV.carts[v.id] = v); 

        $('.loading-container').remove();
        display_products();
    } catch(err){
        console.log(err);
        $('.loading-container').append('<div style="color:red">Une erreur s\'est produite</div>');
        setTimeout(function(){ search_for_products()}, 2000);
    }
}


$(document).on('click','#specific-product-back', function(){
    init_page("main");
});


function display_products(custom_products){
    $('#products-container').html('');
    let html="";

    let products = Object.values(custom_products || GV.products);

    if(GV.selected_big_category !== undefined){
        products = products.filter( (e) => {
            const big_cats = get_product_big_categories(e);
            return big_cats.includes(GV.selected_big_category);
        });
    }
    
    if(GV.sort_dir){
        products.sort((a, b) => moment(a.date).diff(b.date));
    }else{
        products.sort((a, b) => moment(b.date).diff(a.date));
    }
    

    for (let product of products){
        if(product.stock < 1) continue;
        html += product_element_html(product);
    }

    $('#products-area').css({display: "grid"});
    if(html==""){html=no_element_html(); $('#products-area').css({display: "block"});}
    
    $('#products-area').html(html);
}

const product_element_html = (product) =>`
    <div class="product-card" data-id="${product.id}">
        <img src="images/uploads/${product.image}" alt="product.name">
        <div class="desc">
            <div class="name capitalize">${product.name}</div>
            <div class="gray crossed">${product.real_price}DA</div>
            <div class="price" style="padding-left:0;">${product.price}DA</div>
        </div>
    </div>`;


function get_product_big_categories(product){
    if(!product.categories) return null;
    return product.categories.map(c => GV.categories[c].big_category);
}


$(document).on('click','.product-card',async function () {
    GV.selected_product_id = $(this).data("id");
    const product = GV.products[GV.selected_product_id];
    const supplier = GV.suppliers[product.supplier_id];
    fill_product_panel(product, supplier);
    let {lati, longi} = JSON.parse(supplier.content);
    if(lati == undefined | longi == undefined){
        $("#map-error").text("Impossibe de trouver la localisation de ce fournisseur.").
        $(".supplier-address .supplier-map").attr({src : `images/location-pin.png`});
    }else{
        $(".supplier-address .supplier-map").attr({src : `/maps?lat=${lati}&lng=${longi}`});
    }
    fade_panel($('#product-panel'), true);
});

function fill_product_panel(product, supplier){
    const content = JSON.parse(supplier.content);
    // console.log(supplier);
    const html = `
    <div class="panel-header main-color">
        <div class="close-panel" style="float:left; padding:0px 20px;"><img src="./images/left-arrow-black.png" style="height:25px; margin-top:10px;"/></div>
        <div class="product-name uppercase"> ${product.name} </div>
    </div>

    <div class="panel-content">
        <div class="product-img-container left">
            <img src="images/uploads/${product.image}" alt="">
        </div>
            <div class="product-info">
            <div class="main-info flex row">
                <div class="product-name title capitalize">${product.name}</div>
                <div class="product-prices flex col">
                    <div class="old-price">${product.real_price || product.price} DA</div>
                    <div class="price">${product.price} DA</div>
                </div>
            </div>

            <div class="product-description">
                ${product.description}
            </div>
            
            <div class="title size24" style="margin: 15px 5px 10px 5px;">Etablissement:</div>
            <div class="m5"><b>Nom</b> : ${supplier.name}</div>
            <div class="m5 mb10"><b>Adresse</b> : ${content.address || "Non spécifiée"}.</div>
            <div class="m5 mb10"><b>N° de Téléphone</b> : ${content.phone_number}.</div>
            
            <div id="map-error" class="error"></div>
            <div class="supplier-address center">
                <img class= "supplier-map" src="images/orange-loading.gif" alt="">
            </div>

        </div>
        
    </div>

    <div class="panel-footer flex g5 p5" style="padding: 5px;">
        <div id="order-quantity" class="number-picker w50p" data-max="100" style="background:RGBA(0,0,0,0.04);width: 150px;">
            <div class="number-picker-btn main-color" data-action="minus">-</div>
            <div class="number-picker-value">1</div>
            <div class="number-picker-btn main-color" data-action="plus">+</div>
        </div>
        <div id="order-button" class="btn w100p">Commander</div>             
    </div>`;

    $('#product-panel').html(html);
    $('.supplier-actions .call-supplier').data("phone_number", content.phone_number);
    $('.supplier-actions .open-google-maps').data({"lat": content.lati, "lng": content.longi});
}

function supplier_location_map(content){
    let {lati, longi} = JSON.parse(supplier.content);
    // if()
    return ``;
}


$(document).on('click','.call-supplier', function(){
    const {phone_number} = $(this).data()
    console.log(phone_number, "v2");
	window.location = `tel://${phone_number}`;

    $("#call-supplier").click();
});

$(document).on('click','.open-google-maps', function(){
    let {lat, lng} = $(this).data();
    open_gmaps_directions(lat, lng);
});

const open_gmaps_directions = (lat,lng) => window.location = `https://maps.google.com/maps?daddr=${lat},${lng}`;

//////////////////////////////////////////////////////////////////
////////////////////////      SEARCH      ////////////////////////
//////////////////////////////////////////////////////////////////




$("#search-products").on("change", async function(){
    let key = $(this).val();
    console.log(key);
    const products = await ajax2("/ajax/search_products", {key});
    display_products(products);
});


//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
////////////////////////      QOFFAS      ///////////////////////
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////


GV.functions.qoffas = async () => {
    await load_qoffas();
    display_qoffas();
}

async function load_qoffas(){
    const {baskets, err} = await ajax2(GV.base_url+'ajax/load_baskets');
    if (err) console.log(err);
    GV.baskets = baskets;
}

function display_qoffas(){
    let html = "";
    for (const basket of Object.values(GV.baskets)){
        const supplier = GV.suppliers[basket.supplier_id];
        if(supplier == undefined) continue;
        html += (basket.type === 0) ? normal_qoffa_html(basket, supplier) : surprise_qoffa_html(basket, supplier);
    }

    if(html == ""){html = '<div class="gray" style="padding:30px 0px; text-align:center; border-bottom:1px solid #E8E8E8;">Aucun élément à afficher</div>'}
    $("#qoffas-area").html(html);
}

function normal_qoffa_html(basket, supplier){
    const additional_class = expirationWarning(basket.expiry);
    return `
    <div class="qoffa-element swiper-containers" data-id="${basket.id}">
        <div class="qoffa-info pt5">
            <div class="right-side m5">
                <div class="gray size15">${supplier.name}</div>
                <div class="bold size20">${basket.name}</div>
            </div>
            <div class="left-side">
                <div class="size14 bold">DLC : <span class="${additional_class}">${moment(basket.expiry).format("DD MMMM")}</span></div>
                <div class="primary size28 bold">${basket.price} DA</div>
            </div>
        </div>
        <div class="swiper-wrapper flex row">
            ${get_qoffa_items(JSON.parse(basket.products))}    
        </div>
    </div>`;
}


function surprise_qoffa_html(basket, supplier){
    const additional_class = expirationWarning(basket.expiry);
    return `
    <div class="qoffa-element surprise-qoffa" data-id="${basket.id}">
        <div class="qoffa-info pt5">
            <div class="right-side m5">
                <div class="gray size15">${supplier.name}</div>
                <div class="bold size20">Panier Surprise!</div>
            </div>
            <div class="left-side">
                <div class="size14 bold">DLC : <span class="${additional_class}">${moment(basket.expiry).format("DD MMMM")}</span></div>
                <div class="primary size28 bold">${basket.price} DA</div>
            </div>
        </div>
        <div class="swiper-wrapper flex row">
            ${get_qoffa_items(JSON.parse(basket.products), true)}    
        </div>
    </div>`;
}

function get_qoffa_items(items, surprise=false){
    console.log(items)
    let html = "";
    for (id of items){
        const product = GV.products[id];
        if(!product) continue;
        html += surprise ? 
            `<div class="qoffa-item suprise-qoffa-item swiper-slide flex col center">
                    <img src="images/gift.svg" alt="">
                    <div class="item-info">???</div>
             </div>`
            :
            `<div class="qoffa-item swiper-slide flex col center">
                <img src="images/uploads/${product.image}" alt="">
                <div class="item-info">${product.name}</div>
             </div>`;
    }
    return html;
}


$(document).on('click','.qoffa-element', async function(){
    let qoffa_id = $(this).data('id');
    const basket = GV.baskets[qoffa_id];
    console.log(basket);
    const products = JSON.parse(basket.products).map(p=>GV.products[p]);
    let html="";
    console.log(products);
    for (const product of products){
        if(!product) continue;
        const additional_class = expirationWarning(product.expiry);
        html+=`<div class="product-element" data-id="${product.id}">
                <div class="product-element-left">
                    <img class="" src="/images/uploads/${product.image}"/>
                </div>
                <div class="product-element-right">
                    <div class="bold">${product.name}</div>
                    <div class="big_label">${product.price} DA</div>
                    ${moment().diff(moment(product.expiry)) < 0 ? `<div>Expire le : <b class="${additional_class}"> ${moment(product.expiry).format("D MMM")}  </b> </div>` : `<span class="error bold">Expiré</span>`}
                </div>
              </div>`;
    }


    $("#qoffa-panel .panel-content").html(html);
    fade_panel($("#qoffa-panel"), true);
});




////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
///////////////////       HISTORY   /////////////////////////////
////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

GV.functions.history=function(){
    $('#history-category0').html(loading_html());
    load_orders();
}

async function load_orders(){
    try {
        let data = await ajax2( GV.base_url+'ajax/load_orders', { user_id:GV.user.id});
        GV.orders = data['orders'];
        display_header_history_count();
        display_profile_stats();
        $('.loading-container').remove();
        display_history();
    } catch (err) {
        console.log(err);
        $('.loading-container').append('<div style="color:red">Une erreur s\'est produite</div>');
        setTimeout(function(){ load_orders()}, 2000);
    }
}

function display_header_history_count(){
    if(GV.orders == undefined){$('#history-notification').text(0).fadeOut(); return; }
    let count = GV.orders.findBy("status", 0).length;
    if(count  == 0){
        $('#history-notification').text(0).fadeOut();
        return;
    }
    $('#history-notification').text(count).fadeIn();
       
}

function display_history(){  
    $('.history-category').html('');
    let savings = 0;
    let html = {0:"", 1:"",2:""};
    $.each(GV.orders, function(_, order){
        if(order.user_id != GV.user.id ){return true;}
        let product = GV.products[order.product_id];
        if(product == undefined){return true;}
        let supplier = GV.suppliers[product.supplier_id];
        let {logo} = JSON.parse(supplier.content);
        let distance = calculate_distance(GV.lati, GV.longi, supplier.lati, supplier.longi, 'km');
        html[order.status]=`<div class="history-element" data-id="${order.id}">
                    <div class="history-image">
                        <img src="${GV.base_url}images/uploads/${product.image}"/>
                    </div>
                    <div class="padding15">
                        <div class="history-logo-container">
                            <img class="history-logo centered-absolute-image" src="${GV.base_url}images/uploads/${logo || "profile.png"}"/>
                        </div>
                        <div class="bold" style="text-transform:capitalize;">${product.name} (x${order.quantity})</div>
                        <div class="history-element-title bold" style="color:black;">${supplier.name}</div>
                        <div class="history-element-code">CODE <strong>AGX257</strong></div>
                        <div class="history-price main-color" >
                            <span style="margin-right:15px; "><strong >${calculate_price(product, order.quantity)}</strong> DA</span>
                            <span style=" color:#ADADAD; text-decoration: line-through; ">${calculate_real_price(product, order.quantity)} DA</span>
                        </div>
                        <div class="history-date" style="margin-top:5px;">
                            <img src="${GV.base_url}images/time-icon-orange.png" style="width:23px; margin-right:10px; "/>                               
                            <div>10:30 - 12:30</div>
                        </div>
                        <div class="history-distance" style="margin-top:5px;">
                            <img src="${GV.base_url}images/location-icon-orange.png" style="width:20px; margin-right:12px;"/>
                            <div style="padding-top:3px;">À ${distance} km</div>
                        </div>
                        <div class="history-complete-date gray">${moment(order.date).format('LL HH:mm')}</div>
                        <div class="center" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:15px;">
                            <div class="delete-order btn red-background" style="margin:0px;">Annuler</div>
                            <div class="change-order-status btn" data-status="1" style="margin:0px;">RÉCUPÉRÉ</div>
                        </div>
                    </div>
            </div>${html[order.status]}`;
        if(order.status == 1){savings+=(product.real_price - product.price);}

    });

    $.each(html, function(status, local_html){
        if(local_html == ""){local_html='<div class="gray" style="padding:30px 0px; text-align:center; border-bottom:1px solid #E8E8E8;">Aucun élément à Afficher</div>';}
        $('#history-category'+status).html(local_html);
    });


    
    $('#history-savings').html(`<strong>${savings}</strong> DA Economisés`);
}




$(document).on('click','.delete-order',async function(){
    var order_id=$(this).closest('.history-element').data('id');
    await ajax2( GV.base_url+'ajax/delete_item', {table_name:'orders', id:order_id});
    init_page("history");
});

$(document).on('click','.change-order-status', function(){
    var order_id=$(this).closest('.history-element').data('id');
    var status=$(this).data('status');
    change_order_status(order_id, status, $(this));
});

function change_order_status(order_id, status, $button){
    ajax( GV.base_url+'ajax/change_order_status', {order_id:order_id, status:status }, function(data){
       init_page("history");
    }, function(err){
     }, $button)
}



////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
///////////////////       PROFILE    /////////////////////////////
////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

GV.functions.profile=async function(){
    display_profile(); 
    load_orders();
    // requestLocationPermission();
    let {lat, lng} = await getLocation();
    GV.lati = lat; GV.longi = lng;
}

function display_profile_stats(){
    let economies = 0;
    $.each(GV.orders, function(i, order){
        economies+=parseInt(order.real_price-order.price);
    });
    $('#profile-economies').html(economies);
    $('#profile-points').html(GV.orders.length*6);
    $('#profile-points2').html(GV.orders.length);
}


function display_profile(){
    let {phone_number, address, pic} = JSON.parse(GV.user.content);
    $('#user-profile-name').text(GV.user.name);
    $('#user-profile-phone-number').text(phone_number);
    $('#update-phone_number').val(phone_number);
    $('#user-profile-address').text(address);
    const image = pic ? pic : "camera-icon-gray.png" // alt : default-user.jpg
    $('#user-profile-picture img').attr('src',`/images/uploads/${image}`);

    try{GV.user.points = JSON.parse(GV.user.points);}catch(e){}
    let points=0;
    try{ $.each(GV.user.points, function(i,v){ points+=parseInt(v); })}catch(e){}
 
    $('#profile-points, #profile-points2').text(points);
}


$(document).on('click','#profile-update', function(){
    if(!check_form($(this))){return;}
    let user = JSON.stringify({
        id: GV.user.id,
        name: $('#update-name').val(),
        email: $('#update-email').val(),
        password: $('#update-password').val(),
        content: {
            phone_number: $('#update-phone_number').val(),
            pic: null
        }
    }); 

    ajax( GV.base_url+'ajax/update_user', { user }, function(data){
        console.log(data);
        if(data['password_missmatch']){
            $('#profile-update-error').text('Mot de passe non correspondant');
            $('#update-password').css('border','2px solid red');
            return;
        }   
        $('#profile-update-error').text('');

        $('#update-password').css('border','none');
        GV.user = data['user'];
        fade_panel($('.active-panel'),false);
        init_page("profile");
    }, function(err){},$(this));
});



$(document).on('click','#open-profile-update-panel', function(){
    $.each(GV.user, function(i,v){
        if($('#update-'+i).length==0){return true;}
       $('#update-'+i).val(v);
    });
});


$(document).on('click', '#user-disconnect', function(){
    confirm_action('Voulez-vous vraiment vous déconnecter ?', () => {
        const lang = window.localStorage?.lang;
        window.location.replace(`disconnect?lang=${lang||"fr"}`);
    });
});


////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
///////////////////       SPECIFIC product    //////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////


GV.functions.product = function(){
    fade_panel($('#product-page'), true);
    let product = GV.products[GV.selected_product_id];
    let supplier = GV.suppliers[product.supplier_id];

    display_wholeseller(product);
    setTimeout(function(){
        initialize_map($('#product-page-map'), supplier.lati, supplier.longi, 16, false);
    },500);
}



$(document).on('click', '#main-page .product-element, #hot-products .product-element', function(){
    GV.selected_product_id = $(this).data('id');
    GV.functions.product();
});


function display_wholeseller(product){
    let supplier = GV.suppliers[product.supplier_id];
    let cart = GV.carts[1];
    let points = supplier.ccontent?.points || 0;
    const [CART_PRODUCTS, CART_PRICE] = cart_products(cart);
    let html=`<div class="product-element" data-id="${product.id}">
                <div class="panel-content" style="position:relative;">
                    <div class="specific-product-top-actions  linear-top-black-background ">
                        <img style="float:right; height:30px;" src="${GV.base_url}images/heart-icon-white.png"/>      
                        <img class="close-panel" src="${GV.base_url}images/left-arrow-white.png"/>      
                    </div>
                    
                    <div class="product-logo-container">
                        <img class="product-logo centered-absolute-image" src="${GV.base_url}images/uploads/${supplier.content?.logo}"/>
                    </div>
                    <div class="product-image-container">
                        <img class="product-image" src="${GV.base_url}images/uploads/${product.image}"/>                                    
                        <div class="product-element-title-container  linear-black-background">
                            <div class="product-element-title">${supplier.name}</div>
                        </div>
                    </div>
                    <div class="product-element-text">
                        <div class="product-price fright main-color" >
                            <div style=" color:#ADADAD; text-decoration: line-through;">
                                ${product.real_price} DA
                            </div>  
                            <strong >${product.price}</strong> DA
                        </div>

                        <div class="product-date padding5">
                            <img src="${GV.base_url}images/time-icon.png" style="width:23px; margin-right:5px; "/>                                    
                            <div>Aujourd'hui 10:30 - 12:30</div>
                        </div>

                        <div class="product-distance padding5">
                            <img src="${GV.base_url}images/location-icon.png" style="width:20px; margin-right:7px;"/>
                            <div style="padding-top:3px;">À 2.4 km</div>
                        </div>

                        <div id="progress-bar-container">
                            <div class="progress-bar-title" >
                                Vous avez ${get_user_points(supplier.id)} points sur ${points} <br> (Repas gratuit à ${points} points)
                            </div>
                        </div>
                    </div>
              
                    <div id="product-information" >
                        <div class="title carousel-title" style="padding:5px 0px; padding-bottom:20px; font-size:18px;">CONTENU DU PANIER</div>
                        <div class="center" style="margin-top:20px;"> 
                            <img src="${GV.base_url}images/uploads/${product.image}" style="width:100%; margin-bottom:20px;"/>
                            ${product.description}
                        </div>
                    </div>
                
                    <div id="product-information" style="margin-bottom:200px;" >
                        <div class="title carousel-title" style="padding:5px 0px; padding-bottom:20px; font-size:18px;"><span>ADRESSE DE L'ETABLISSEMENT</span></div>
                        21 Lotissement des Lilas, Kouba, Alger    
                        <div class="center" style="margin-top:20px;"> 
                            <div id="product-page-map" style="display:inline-block;  width:90%; height:300px;"></div>
                        </div>         
                        <div class="center">
                            <div class="btn" style="background:#3858ab; margin-top:20px;">PARTAGER VIA FACEBOOK</div>
                        </div>
                    </div>
                    
                </div>
            </div>
            <div class="panel-footer" style="display:grid; grid-template-columns:140px 1fr; align-items:center; ">
                <div style="padding:0px 15px;">${number_picker_html('order-quantity',1, product.stock)}</div>
                <div id="order-button" class="btn no-radius" style="width:90%;">RESERVER</div>                
            </div>`;

    let html2=`<div class="product-element" data-id="${product.id}">
                <div class="panel-content" style="position:relative;">

                    <div class="product-element-text">
                        <div class="product-price fright main-color" >
                            <div style=" color:#ADADAD; text-decoration: line-through;">
                                ${CART_PRICE.real_price} DA
                            </div>  
                            <strong >${CART_PRICE.price}</strong> DA
                        </div>

                        <div class="product-date padding5">
                            <img src="${GV.base_url}images/time-icon.png" style="width:23px; margin-right:5px; "/>                                    
                            <div>Aujourd'hui 10:30 - 12:30</div>
                        </div>

                        <div class="product-distance padding5">
                            <img src="${GV.base_url}images/location-icon.png" style="width:20px; margin-right:7px;"/>
                            <div style="padding-top:3px;">À 2.4 km</div>
                        </div>

                    </div>
                    <div id="product-information" >
                        <div class="title carousel-title" style="padding:5px 0px; padding-bottom:20px; font-size:18px;">CONTENU DU PANIER</div>
                        ${CART_PRODUCTS}
                    </div>

                    ${supplier_address_card()}
                
                </div>
            </div>
            <div class="panel-footer" style="margin: auto;">
                <div id="order-button" class="btn no-radius" style="width:90%;">RESERVER CE PANIER</div>                
            </div>`;

        // $('#cart-page').html(html2);
        $('#product-page').html(html);
}

function cart_products(cart){
    let html = '', CART_PRICE = {price:0, real_price:0}
    for (let p of JSON.parse(cart.products)){
        let product = GV.products[p.id];
        html += product_info_card(product);
        CART_PRICE.price+=product.price
        CART_PRICE.real_price+=product.real_price;
    }
    return [html, CART_PRICE];
}

function get_user_points(supplier_id){
    if(!GV.user.id || !GV.user.points){return 0;}
    var supplier_points=GV.user.points[supplier_id];
    if(supplier_points == undefined){return 0;}
    return supplier_points;
}

function product_info_card(product){
    return `
        <div class="center" style="margin-top:20px;"> 
            <img src="${GV.base_url}images/uploads/${product.image}" style="width:100%; margin-bottom:20px; max-height:40vh; object-fit:cover;"/>
            ${product.description}
        </div>`
}

function supplier_address_card(){
    return `
    <div id="product-information" style="margin-bottom:200px;" >
        <div class="title carousel-title" style="padding:5px 0px; padding-bottom:20px; font-size:18px;"><span>ADRESSE DE L'ETABLISSEMENT</span></div>
        21 Lotissement des Lilas, Kouba, Alger    
        <div class="center" style="margin-top:20px;"> 
            <div id="product-page-map" style="display:inline-block;  width:90%; height:300px;"></div>
        </div>         
        <div class="center">
            <div class="btn" style="background:#3858ab; margin-top:20px;">PARTAGER VIA FACEBOOK</div>
        </div>
    </div>`;
}

$(document).on('click','#order-button', function(){
    fade_panel($('#order-confirm-panel'), true);
});


$(document).on('click','#login-button', function(){
    if(!check_form($(this))){return;}

    user_login($('#login-email').val(), $('#login-password').val(), function(){
        fade_panel($('#login-panel'), false);
        if(GV.selected_product_id != undefined){
            save_order($('#confirm-order-button'));
            return;
        }
        init_page("main");
    });
});


function user_login(email, password, callback){
    ajax( GV.base_url+'ajax/login', { email:email, password:password }, function(data){
        if(data['user']['id'] == undefined){
            $('#login-error').html('Identifiants non valides');
        }else{
            $('#login-error').html('');
            GV.user=data['user'];
            
            callback();  
        }
    }, function(err){
        console.log(err);
        $('#login-error').html('une erreur s\'est produite, veuillez réessayer');
    })
}

$(document).on('click','#confirm-order-button', async function(){
    if(!GV.user.id){
        $('#login-panel .close-panel').css('display','inline-block');
        fade_panel($('#login-panel'), true);
        return;
    }
    await save_order($(this));
});

async function save_order($button){
    let product = GV.products[GV.selected_product_id];
    if (product == undefined) return;
    let code='C'+generate_random_string('all',5);
    let quantity = get_number_picker_value('order-quantity') || 0;
    let {supplier_id, price, real_price} = product;
    let order = {
        code,
        quantity,
        user_id:GV.user.id, 
        product_id: GV.selected_product_id,
        supplier_id, price, real_price
    };
    
    try {
        console.log("saving...", order);
        await ajax2(GV.base_url+'ajax/save_order', {order});
        fade_panel($('#order-success-panel'), true);
    } catch (e) {
        console.error(e);
        $button.append('<div style="color:red">Une erreur s\'est produite</div>');
    }
}

$(document).on('click','#go-to-history', function(){
    init_page("history");
});


//////////////////////////////////////////////////////////////////
//////////////////////      MAPS      ////////////////////////////
//////////////////////////////////////////////////////////////////


async function requestLocationPermission(){
    if ("android" in window){ 
        android.getLocationPermission();
    }else{
        let {state} = await navigator.permissions.query({name:"geolocation"});
        if (state != "granted") alert("Please allow location access");
    }
}