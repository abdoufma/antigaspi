// @ts-checks
// const $ = require("jquery");
GV.product_types={"0":"Pannier surprise", "1":"Produit unique"};

$(document).on('click','.header-button', async function(){
    let name = $(this).data('name');
    init_page(name);
    if ("android" in window){
        $('.header-button div:last-child').text("");
        GV.token = window.android.getToken();
        try{
            await ajax2(GV.api_url+'save_token', {id:GV.user.id, token:GV.token});
        }catch(e){alert(JSON.stringify(e));}
    } else console.log('f off');
});

const loaded = new Event('loaded');

document.addEventListener('loaded',  (e) => GV.loaded = true , false);


function init_page(name){
    let $button = $(`.header-button[data-name="${name}"]`);
    $('.page').css('display','none');
    $('#'+name+'-page').css('display','block');
    $('.active-header-button').removeClass('active-header-button');
    $button.addClass('active-header-button');
    $('#top-header-text').html($button.data('header'));
    if(GV.functions[name] == undefined){return;}
    GV.functions[name]();
}



async function load_all(callback){
    try {
        let supplier_id = GV.isSupplier ? GV.user.id : 0;
        let data = await ajax2(GV.api_url+'load_all', {supplier_id});
        if(data.error) {console.log(data.error); return;}
        index_items(data)
        callback();
        document.dispatchEvent(loaded);
    } catch (e) {
        console.error(e);
        $('.loading-container').append('<div style="color:red">Une erreur s\'est produite</div>');
        // setTimeout(function(){ load_all(callback)}, 2000);
    }


}


function index_items(data){
    $.each(data, function(table_name, table_data){
        if( GV[table_name]== undefined ){   GV[table_name]={};  }
        $.each(table_data, function(row_index, row){
            GV[table_name][row.id]=row;
            $.each(row, function(column_name, column_value){
                if(typeof column_value != "string"){return true;}
                if(column_value[0] == '{' || column_value[0] == '['  ){
                    try{GV[table_name][row.id][column_name]=JSON.parse(column_value);}catch(e){}              
                }
            });
        });
    });
}


function display_last_inserted(){
    if(GV.last_inserted_element !== false){
        $(`.table-element[data-id="${GV.last_inserted_element}"]`).css('display','none').slideDown().addClass('new-element').toggleClass('new-element',1000)
    }
    GV.last_inserted_element = false;
}


function column_titles_html(titles){
    var local_html="";
    $.each(titles, function(title_index, title_name){
        local_html+=` <div class="table-column bold darkgray">${title_name}</div>`;
    });
    return `<div class="table-element table-titles" >${local_html}</div>`;
}





///////////////////////////////////////////////////////////
///////////////////////    USERS     ///////////////////
///////////////////////////////////////////////////////////

GV.functions.users = function(){
    document.addEventListener('loaded', (e) => display_users(), false);
    load_all(display_users);
}

async function display_users(key){
    let users = GV.users;
    let html = '';

    $.each(users, function (i, user) {
        let pic = user.content?.pic || "profile.png";
        pic = pic.startsWith("http") ? pic : `./images/uploads/${pic}`;
        html = `<div class="table-element user-list-element" data-id="${user.id}" data-table="users">
                <div class="table-column"><div class="user-photo"><img src="${pic}" /></div></div>
                <div class="table-column"><div class="bold capitalize user-name">${replace_key(key, user.name)}</div></div>
                <div class="table-column">${replace_key(key, user.content?.phone_number)}</div>
                <div class="table-column">${replace_key(key, user.email)}</div>
                <div class="table-column">${replace_key(key, user.content?.address)}</div>
                <div class="table-column gray">${moment(user.date).format('LL')}</div>
                <div class="open-popover"> <img src="./images/actions.png" /></div>
            </div>` + html;
    });
    html = column_titles_html(["Photo", "Identité", "N° de téléphone", "Email", "Adresse", "Date"]) + html;
    if (Object.keys(users).length == 0) { html = no_element_html(); }

    $('#users-table').html(html).css('display', 'none').fadeIn();
    display_last_inserted();
}



///////////////////////////////////////////////////
/////////////// SAVING AND DELETING    ///////////////
//////////////////////////////////////////////////

$(document).on('click','.save-item', async function(){
    if(!check_form($(this))){return;};
    let $button = $(this);
    let $form = $('.active-panel').find('.form');
    let item = {content: {}};
    let table = $(this).data('table');

    $form.find(`select, input, textarea`).each(function(){
        let column_name = $(this).data('id');
        if(column_name == undefined){return true;}
        item[column_name] = $(this).val();
    });

    
    if(table == "suppliers"){
        if($('#supplier-password').val() == ""){ delete item['password'];}
        if(  $('#supplier-logo-name').val() == "placeholder" ){ display_form_error($button, 'Veuillez ajouter un logo'); return; }
        if(  $('#supplier-logo-name').val() == "" ){ display_form_error($button, 'Upload de l\'image toujours en cours'); return; }
        item = {
            id : item.id,
            name: $form.find('[data-id="name"]').val(),
            email: $form.find('[data-id="email"]').val(), 
            password: $form.find('[data-id="password"]').val(),
            content: JSON.stringify({
                phone_number: $form.find('[data-id="phone_number"]').val(),
                logo: $('#supplier-logo-name').val(),
                address: $form.find('[data-id="address"]').val(),
                supplier_type: $form.find('[data-id="supplier_type"]').val(),
                lati: 36.7532,
                longi: 3.06908,
            })
        };

        console.log({supplier:item});
        // return;
    }
      
    
    if(table == "products"){
        item["stock"]=$('#product-stock').text();
        if(  $('#product-image-name').val() == "" ){ display_form_error($button, 'Upload de l\'image toujours en cours'); return; }
        item['image']=$('#product-image-name').val();

        if(GV.isSupplier)
            item.supplier_id = GV.user.id;
        else
            item.supplier_id = item["product-supplier"]; 

        console.log({product:item});
        delete item["product-supplier"];
    }
      
    if(table == "publications"){
        item.supplier_id = GV.user.id;
    }

    if(table == "categories"){
        if(  $('#category-image-name').val() == "placeholder" ){ display_form_error($button, 'Veuillez ajouter une image'); return; }
        if(  $('#category-image-name').val() == "" ){ display_form_error($button, 'Upload de l\'image toujours en cours'); return; }
    }


    if(item.id == ""){delete item.id;}
    console.log({item, table});

    let data;

    if(table == "suppliers"){
        data = await ajax2( GV.api_url+'save_user', {item:{...item, type: "supplier"}});
    }else{
        data = await ajax2( GV.api_url+'save_item', { item ,table}, $button);
    }


    try{ GV.last_inserted_element = data[table][0].id;}catch(e){}
    index_items(data);
    $(`#black-screen`).click();
    $(`.active-header-button`).click();
});





function display_form_error($button, error){
    $button.closest('.panel-footer').find('.error').text(error);
}


$(document).on('click','.delete-element', function(e){
    let $element = $(this).closest('.table-element');
    let {id} = $element.data();
    let table_name = $element.data('table');
    console.log({id, table_name});
    const isUser = table_name == "suppliers" || table_name == "users";
    const message = isUser ? "Etes-vous sûr de vouloir supprimer cet utilisateur?<br>Cette operation va bannir l'utilisateur d'uiliser les mêmes identifiants sur l'application." : 'Etes-vous sûr de vouloir supprimer cet élement?';
    confirm_action(message, async function(){
        $(`.table-element[data-id="${id}"]`).addClass('deleted-element');
        try{
            if(isUser){
                await ajax2( GV.api_url+'delete_user', {id});
            }else {
                await ajax2( GV.api_url+'delete_item', {id, table_name:"products"});
                $(`#${table_name}-table .table-element[data-id="${id}"]`).slideUp();
            }
            // else{}
            setTimeout(() => {delete GV[table_name][id]; $(`.active-header-button`).click();}, 1000);  
        }catch(e){}
    })
});

$(document).on('click','.delete-user', function(e){
    let $element = $(this).closest('.table-element');
    let {id} = $element.data();
    let table_name = $element.data('table');
    console.log({id, table_name});
    const isUser = table_name == "suppliers" || table_name == "users";
    message = isUser ? "Etes-vous sûr de vouloir supprimer cet utilisateur?<br>Cette operation va bannir l'utilisateur d'uiliser les mêmes identifiants sur l'application." : 'Etes-vous sûr de vouloir supprimer cet élement?';
    confirm_action('Etes-vous sûr de vouloir supprimer cet élement?', async function(){
        $(`.table-element[data-id="${id}"]`).addClass('deleted-element');
        try{
            if(isUser){
                await ajax2( GV.api_url+'delete_user', {id});
            }else {
                await ajax2( GV.api_url+'delete_item', {id, table_name:"products"});
                $(`#${table_name}-table .table-element[data-id="${id}"]`).slideUp();
            }
            // else{
            // }
            setTimeout(function(){
                delete GV[table_name][id];
                $(`.active-header-button`).click();
            }, 1000);  
        }catch(e){}
    })
});

///////////////////////////////////////////////////////////
///////////////////////    SUPPLIERS     ///////////////////
///////////////////////////////////////////////////////////

GV.functions.suppliers=function(){
    load_all(display_suppliers);
}


async function display_suppliers(key){
    let suppliers = GV.suppliers;
    let html=''; 

    $.each(suppliers, function(i,supplier){    
        let active_html=`<div class="activation-btn btn green" >Activé</div>`;
        if(supplier.active == 0){   active_html='<div class="activation-btn btn red">Désactivé</div>';  }
        // supplier.content = JSON.parse(supplier.content);
        let logo = supplier.content?.logo || "profile.png";
        html =`<div class="table-element supplier-list-element" data-id="${supplier.id}" data-table="suppliers">
                <div class="table-column"><div class="user-photo"><img src="./images/uploads/${logo}" /></div></div>
                <div class="table-column"><div class="bold capitalize supplier-name">${replace_key(key,supplier.name)}</div></div>
                <div class="table-column">${replace_key(key,supplier.content?.phone_number)}</div>
                <div class="table-column">${supplier_type(supplier)}</div>
                <div class="table-column">${supplier.content?.address || "Non spécifié"}</div>
                <div class="table-column">${active_html}</div>
                <div class="table-column gray">${moment(supplier.date).format("D MMM YY")}</div>
                <div class="open-popover"> <img src="./images/actions.png" /></div>
            </div>` + html;
    });
    html = column_titles_html(["Photo","Identité", "N° de téléphone", "Type", "Adresse", "Status du compte", "Date d'inscription"]) + html;
    if(Object.keys(suppliers).length == 0){ html=no_element_html();}

    $('#suppliers-table').html(html).css('display','none').fadeIn();
    display_last_inserted();
}

function supplier_type(supplier){
    const french_names = {"normal" : "Particulier", "retailer": "Commerçant", "wholeseller": "Grossiste"};
    let type = supplier.content?.supplier_type;
    return type ? french_names[type] : '<div class="gray">Non spécifié</div>';
}

$(document).on('click','.activation-btn', async function(){
    let id = $(this).closest('.table-element').data('id');
    let active = 0;
    if(GV.suppliers[id].active == 0){active=1;}

    let item = {id, active}
    let data = await ajax2( GV.api_url+'save_item', { item ,table:"users"}, $(this));
    try{ GV.last_inserted_element = data[table][0].id;}catch(e){}
    index_items(data);
    $(`.active-header-button`).click();
});

$(document).on('click','#copy-link', function(){
    var button_text=$(this).text();
    $(this).text('Copié');
    var copyText = document.getElementById("supplier-link");
    copyText.select();
    copyText.setSelectionRange(0, 99999); /*For mobile devices*/
    document.execCommand("copy");

    setTimeout(function(){$('#copy-link').text(button_text);},2000);
});








///////////////////////////////////////////////////////////
///////////////////////    order     ///////////////////
///////////////////////////////////////////////////////////

GV.functions.orders = function(){
    load_all(display_orders);
}



$(document).on('click','#crm-orders-filter .tab-button', function(){
    load_all(display_orders);
});

function display_orders(key){
    let html = "";
    let filter = '' + $('#crm-orders-filter .active-tab-button').data('value');
    let orders = GV.orders;
    $.each(orders, function(index, order){
        let user = GV.users[order.user_id];
        let product = GV.products[order.product_id];
        let supplier = GV.isSupplier ? GV.user.id : GV.suppliers[order.supplier_id];
        // if(GV.isSupplier){
        //     if(order.supplier_id != GV.user.id){return true;}
        // }
        if(user == undefined || supplier == undefined || product == undefined){return true;}
        // if(filter !== "" && filter !=undefined && order.status != filter){return true;}


        let image = product.image;
        if(!image){image = "food-icon-gray.png"};

        html =`<div class="table-element product-list-element" data-product_id="${product.id}" data-id="${order.id}" data-table="orders">
            <div class="table-column"><div class="user-photo"><img src="./images/uploads/${image}" /></div></div>
            <div class="table-column"><div class="bold capitalize product-name">${replace_key(key,product.name)}</div> <div >${replace_key(key,supplier.name)}</div></div>
            <div class="table-column bold">${replace_key(key,user.name)} <div class="gray">${user.content.phone_number}</div> <div class="gray">${user.content.address}</div></div>
            <div class="table-column bold">${order.code}</div>
            <div class="table-column gray">${moment(order.date).fromNow()}</div>
            <div class="open-popover"> <img src="./images/actions.png" /></div>
        </div>` + html;
    });
    if(html == ""){ 
        html=no_element_html();
    }else{
        html = column_titles_html(["Photo","Produit", "Utilisateur", "Code", "Date"]) + html;
    }

    $('#orders-table').html(html);
}
    


///////////////////////////////////////////////////////////
///////////////////////    PRODUCTS     ///////////////////
///////////////////////////////////////////////////////////
GV.functions.products=function(){
    load_all(display_products);
}


function display_products(key){
    let products = GV.products;
    let html=''; 

    $.each(products, function(i, product){      
        console.log(product.name);
        let supplier = GV.isSupplier ? GV.user.id : GV.suppliers[product.supplier_id];
        if(supplier == undefined) {return true;}
        let image = product.image;
        if(!image){image="profile.png"};
        html =`<div class="table-element product-list-element" data-id="${product.id}" data-table="products">
                <div class="table-column" style="padding:0px;"><img src="./images/uploads/${image}" style="width:100%;"/></div>
                <div class="table-column"><div class="bold capitalize product-name">${replace_key(key,product.name)}</div><div>${supplier.name}</div></div>
                <div class="table-column">${get_product_categories(product)}</div>
                <div class="table-column">${GV.product_types[product.type]}</div>
                <div class="table-column bold">${product.stock} disponibles</div>
                <div class="table-column gray">${moment(product.expiry).fromNow()}</div>
                <div class="open-popover"> <img src="./images/actions.png" /></div>
            </div>` + html;
    });

    html = column_titles_html(["Photo","Nom", "Categories", "Type", "Stock", "Date de péremption"]) + html;
    if(Object.keys(products).length == 0){ html=no_element_html();}

    $('#products-table').html(html).css('display','none').fadeIn();
    display_last_inserted();
}



function display_categories_select(){
    let html=``;
    $.each(GV.categories, function(i,v){
        if(v.type !=0 ){return true;} 
        html+=`<option value="${v.id}">${v.name}</option>`;
    })
    
    $('#product-category').html(html).select2({ dropdownParent: $("#product-panel"), width:'resolve'});
}



function get_product_categories(product){
    var local_html="";
    $.each(product.categories, function(useless_index, category_id){
        if(local_html != ""){local_html+=", ";}
        local_html+=GV.categories[category_id].name;
    });
    return local_html;
}



function display_suppliers_select(){
    var html=``;
    $.each(GV.suppliers, function(i,v){
        html+=`<option value="${v.id}">${v.name}</option>`;
    })
    $('#product-supplier').html(html).closest('.form-element').css('display','block');
}



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



$(document).on('click','#publication-image-container, #publication-upload-container', function(){
    GV.image_container=$('#publication-image-container');
    $('.upload-image').click();
});


$(document).on('click','#category-image-container, #category-upload-container', function(){
    GV.image_container=$('#category-image-container');
    $('.upload-image').click();
});

$(document).on('click','#product-image-container, #product-upload-container', function(){
    GV.image_container= $('#product-image-container');
    $('.upload-image').click();
});
$(document).on('click','#supplier-logo-container', function(){
    GV.image_container=$('#supplier-logo-container');
    $('.upload-image').click();
});

$(document).on('change','.upload-image', function(){
    GV.image_container.fadeIn();
    $('#product-upload-container, #category-upload-container').css('display','none');
    GV.image_container.find('.image-name').val('');
    let file = this.files[0];
    display_uploading_image(file, GV.image_container);
    upload_image(file);
});


function display_uploading_image(file, $image_container){
    if(file == undefined){return;}
    
    $image_container.find('img').attr('src',URL.createObjectURL(file));
    $image_container.find('.upload-progress').remove();
    $image_container.append('<div class="upload-progress" data-file_id="'+file.name+''+file.lastModified+'" >20%;</div>')
}






///////////////////////////////////////////////////
/////////////// CATEGORIES      ///////////////
/////////////////////////////////////////////////
GV.functions.categories=function(){
    document.addEventListener('loaded', _=> show_categories(), false);
    display_categories();
}




function display_categories(){    
    if (GV.loaded){
        show_categories();
    }else{
        $('.dashboard-card-value').html('<img width=40 src="./images/orange-loading.gif">');
    }
}


function show_categories(){
    let categories = GV.categories;
    let html = ''; 

    $.each(categories,function(i,category){
        if(category.type !=0){return true;}

        let image = category.image;
        if(!image){image="food-icon-gray.png"};

        let big_category = GV.categories[category.big_category];
        
        html =`<div class="table-element product-list-element" data-id="${category.id}"  data-table="categories">
                <div class="table-column" style="padding:0px;"><img src="./images/uploads/${image}" style="width:100%;"/></div>
                <div class="table-column"><div>${category.name}</div></div>
                <div class="table-column"><div>${big_category?.name || "(unconnue)"}</div></div>
                <div class="open-popover"> <img src="./images/actions.png" /></div>
            </div>` + html;
    });
    html = column_titles_html(["Photo","Nom de la catégorie", "Sous-categorie"]) + html;
    if(Object.keys(categories).length == 0){ html = no_element_html();}
    
    
    $('#categories-table').html(html).css('display','none').fadeIn();
    display_last_inserted();
}


$(document).on('click','#new-product', function(){
    if(GV.isSupplier){
        setTimeout( () => $('#product-supplier').val(GV.user.id), 100);
    }
});

$(document).on('click','#new-category',function(){
    $('#category-id').val('');
    $('#category-name').val('');
    $('#category-upload-container').css('display','block');
    $('#category-image-container').css('display','none');
    display_big_categories_select();
});

$(document).on('click','.category-list-element',function(){
    var category=GV.categories[$(this).data('id')];
    $('#category-id').val(category.id);
    $('#category-name').val(category.name);
    $('#category-upload-container').css('display','none');
    $('#category-image-container').css('display','block').find('img').attr('src',GV.base_url+'/images/uploads/'+category.image);
    $('#category-image-name').val(category.image);
    fade_panel($('#category-panel'), true);
    display_big_categories_select();
    if(typeof category.big_categories != "object"){category.big_categories=JSON.parse[category.big_categories]; }
    $('#big-category-select').val(category.big_categories).trigger('change');
});


$(document).on('click','#open-categories-panel',function(){
    display_categories();
});



function display_big_categories_select(){
    var html=``;
    $.each(GV.categories, function(i,v){
        if(v.type !=1){return true;} 
        html+=`<option value="${v.id}">${v.name}</option>`;
    })
    
    $('#big-category-select').html(html).select2({ dropdownParent: $('#big-category-select').closest('.panel'), width:'resolve'});
}




///////////////////////////////////////////////////
//////////////////   DASHBOARD   /////////////////
/////////////////////////////////////////////////


GV.functions.dashboard = function(){
    display_dashboard();
    document.addEventListener('loaded', show_numbers, false);
}

function display_dashboard(){    
    if (GV.loaded){
        show_numbers();
    }else{
        $('.dashboard-card-value').html('<img width=40 src="./images/orange-loading.gif">');
    }

}


function show_numbers(){
    let chiffre = 0;
    const orders = Object.values(GV.orders);
    for (const order of orders){
        const commission = GV.products[order.product_id]?.benefit || 10 ;
        if(order.price){
            chiffre += Math.abs(order.price - order.real_price) * (commission/100);
        }
    }
    $("#chiffre-count").text(chiffre+" DA");
    $("#orders-count").text(Object.keys(GV.orders).length);
    $("#products-count").text(Object.keys(GV.products).length);
    $("#users-count").text(Object.keys(GV.users).length);
}

///////////////////////////////////////////////////
/////////////// POPOVER      ///////////////
/////////////////////////////////////////////////

$(document).on('click','.reinitialize-form', function(e){
    reinitialize_form($(this).data('form'));  
});
$(document).on('click','body', function(e){
    if($('.my-popover:hover, .open-popover:hover, #admin-popover:hover').length != 0){return;}
    $('.my-popover').remove();
});

$(document).on('click','#disconnect-button', async function(){
    confirm_action('Etes-vous sûr de vouloir vous déconnecter?', async function(){
        window.location.replace('disconnect');
    });
});

$(document).on('click','#admin-popover', function(e){
    $('.my-popover').remove();

    var html=`<div class="my-popover">
            <div id="disconnect-button" class="popover-button"><div><img src="./images/header-logout-icon-black.png"/></div><div>Déconnexion</div></div>
        </div>`;

    $(this).append(html);
});

$(document).on('click','.open-popover', function(e){
    console.log($(this)[0]);
    $('.my-popover').remove();
    var html=`<div class="my-popover">
                <div class="edit-element popover-button"><div><img src="./images/edit6.png"/></div><div>Modifier</div></div>
                <div class="delete-element popover-button"><div><img src="./images/delete.png"/></div><div>Supprimer</div></div>
             </div>`;

    if ($(this).hasClass('trip-popover')){
        html=`<div class="my-popover">
                    <div class="edit-element popover-button" data-id="change-status"><div><img src="./images/edit6.png"/></div><div>Modifier le statut</div></div>
                    <div class="edit-element popover-button" data-id="assign-driver"><div><img src="./images/assign-driver-black.png"/></div><div>Assigner un chauffeur</div></div>
              </div>`;
    }

    $(this).after(html);
})


$(document).on('click','.edit-element', function(e){
    let page_name = $('.active-header-button').data('name').slice(0, -1);
    reinitialize_form(page_name);
    let id = $(this).closest('.table-element').data('id');

    if(page_name == 'supplier'){
        fill_supplier_panel(id);
    }

    if(page_name == 'user'){
        fill_user_panel(id);
    }

    if(page_name == 'product'){
        fill_product_panel(id);
    }
    
    if(page_name == 'categorie'){
        fill_category_panel(id);
    }
    
    fade_panel($('#'+page_name+'-panel'));
});


function reinitialize_form(form_name){
    scroll_to_top($(`#${form_name}-form`).closest('.panel-content'));
    $(`#${form_name}-form input, #${form_name}-form select, #${form_name}-form textarea`).val('');
    $('#product-image-container').css('display','none');
    $('#product-upload-container').css('display','block');
    $('#delete-product').css('display','none');
    display_categories_select();
    display_suppliers_select();



    $('#supplier-panel .form input').val('');
    $('#supplier-logo-container img').attr('src',GV.base_url+'images/food-icon-gray.png');
    $('#supplier-logo-name').val('');
}



function fill_category_panel(id){
    display_big_categories_select();

    var category=GV.categories[id];
    $.each(category, function(i,v){
        $(`#category-form *[data-id="${i}"`).val(v);
    });
    fade_panel($('#category-panel'), true);
    
}

function fill_user_panel(user_id){
    var user=GV.users[user_id];
    $.each(user, function(i,v){
        $(`#user-form *[data-id="${i}"]`).val(v).trigger('change');
    });

    $(`#user-form input[data-id="password"`).val('');
}

function fill_supplier_panel(supplier_id){
    let supplier = GV.suppliers[supplier_id];
    $(`#supplier-password`).val(supplier.password);
    $(`#supplier-panel *[data-id="id"]`).val(supplier.id);
    $(`#supplier-panel *[data-id="name"]`).val(supplier.name);
    $(`#supplier-panel *[data-id="email"]`).val(supplier.email);
    $(`#supplier-panel *[data-id="address"]`).val(supplier.content.address);
    $(`#supplier-panel *[data-id="phone_number"]`).val(supplier.content.phone_number);
    $(`#supplier-panel *[data-id="supplier_type"]`).val(supplier.content.supplier_type);
    $('#supplier-logo-container img').attr('src',GV.base_url+'images/uploads/'+supplier.content.logo);
    $('#supplier-logo-name').val(supplier.content.logo);
    $('#supplier-link').val(GV.base_url+`/supplier/${btoa(supplier.id)}`);
    fade_panel($('#supplier-panel'), true);

}
      

function fill_product_panel(product_id){
    let product=GV.products[product_id];
    $('#product-image').attr('src',''+GV.base_url+'images/uploads/'+product.image);
    $('#product-image-name').val(product.image);

    $('#product-supplier').html('<option selected value="'+product.supplier_id+'">Fournisseur</option>').closest('.form-element').css('display','none');

    $('#product-id').val(product.id);
    $.each(product, function(i,v){
        $('#product-'+i).val(v);
    });

    $('#product-stock').text(product.stock);
    $('#product-expiry').val(moment(product.expiry).format('YYYY-MM-DD'));
    display_categories_select();
    console.log("de", product.categories);
    
    $('#product-category').val([product.categories]).trigger('change');

    $('#delete-product').css('display','inline-block');
    $('#product-image-container').css('display','block');
    $('#product-upload-container').css('display','none');
}
      