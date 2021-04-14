const API_KEY = 'AIzaSyCRzO-AIr4QKIoVd4LBfXWDsY7hKUuH7lc';

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    document.cookie = cname + "=" + cvalue + "; expires="+ d.toUTCString()+" ;path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = decodeURIComponent(document.cookie).split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {	c = c.substring(1);	}
        if (c.indexOf(name) == 0) {	return c.substring(name.length, c.length);	}
    }
    return "";
}

function generate_random_string(type, length) {     
    var possible={
        all:"abcdefghijklmnopqrstuvwxyz0123456789",
        numbers:"0123456789",
        letters:"abcdefghijklmnopqrstuvwxyz"
    };
    possible=possible[type];
        
    var random_string="";
    for (var i = 0; i < length; i++)
        random_string += possible.charAt(Math.floor(Math.random() * possible.length));

    return random_string;
}


$(document).on('click','.open-panel', function(){
    fade_panel($('#'+$(this).data('panel')), true);
})

$(document).on('click','.close-panel', function(){
    fade_panel($(this).closest('.panel'), false);
})
  
$(document).on('click','.black-screen, .close-all-panels', function(){
    fade_panel($('.active-panel'),false);
});


$(document).on('click','#black-screen', function(){
    fade_panel($('.active-panel'), false);
});


function fade_panel($selector, boolean){
    var $empty_panel=$('#empty-panel');
    var $empty_panel=$selector;
    if($selector.attr('id')  == "navigation-panel"){ $empty_panel=$('#empty-nav-panel');} 
    $empty_panel.find('#empty-panel-title').text($selector.find('.panel-header').text());

    if(boolean === false){
        $empty_panel.addClass('panel-slide-out').css('display','inline-block');
        setTimeout(function(){
        $selector.css('display','none');
      },200)  
        setTimeout(function(){   $empty_panel.css('display','none')  },200);
        $selector.removeClass('active-panel');
        if($('.active-panel').length == 0){
            $('#black-screen').fadeOut();
        }
        return;
    }
    $empty_panel.removeClass('panel-slide-out');
    $empty_panel.addClass('panel-slide-in').css('display','inline-block');
    $selector.addClass('active-panel');
    setTimeout(function(){$empty_panel.css('display','none'); $selector.css('display','inline-block');}, 200);
    $('#black-screen').fadeIn(); 
}


/** LOCATION THINGS */


function ajax(url, data, callback, error_callback, $button){
    ajax_button_loading($button, '');
    $.ajax({type: 'POST', url: url, data:data, 
        success:function(data){ callback(data); ajax_button_loading($button, 'success'); }, 
        error:function(err){ console.log(err); error_callback(err); ajax_button_loading($button, 'error'); },
    });
}

async function ajax2(url, data){
    return await $.ajax({type: 'POST', url, data});
}

function calculate_price(product, quantity){
    return product.price * quantity;
}

function calculate_real_price(product, quantity){
    return product.real_price * quantity;
}


function ajax_button_loading($button, status){
    if($button == undefined){return;}
    $button.find('.btn-loading').remove();
    if(status == undefined || status == ""){
        $button.append('<div class="btn-loading"><img src="./images/orange-loading.gif" style="width:25px;"/></div>');
    }
    if(status == 'error'){
        $button.append('<div class="btn-loading">Erreur</div>');
    }
    if(status == 'success'){}
}


function check_form($button){
    var $form=$('.form[data-id="'+$button.attr('id')+'"]');
    if($form.length == 0){return true;}
    var error="";
    $form.find('input').each(function(){
        if($(this).val() == "" && $(this).hasClass('required')){
            $(this).css('border','2px solid red');
            error="empty";
        }else{
            $(this).css('border','none');
        }
    });
    if(error ==""){return true;}
    return false;
}


function carousel(selector,passed_options, callback){
    if(callback==undefined){callback=function(){};}
    $(selector).wrapInner('<div class="swiper-wrapper"></div>');
    $(selector).find('.carousel-element').addClass('swiper-slide');

    var options={  slidesPerView: 'auto',   freeModeSticky:true, freeMode:true, freeModeMomentumRatio:0.4	};
    if(passed_options != undefined){
        $.each(passed_options, function(option_title, option_value){
            options[option_title]=option_value;
        })
    }
    
    if(GV.swipers[selector] != undefined){	GV.swipers[selector].destroy(true, true); }
    GV.swipers[selector]= new Swiper (selector, options);
    
    GV.swipers[selector].on('slideChangeTransitionEnd', function () {
        var currentSlide = GV.swipers[selector].activeIndex;
        var gtag_value=JSON.stringify({current_slide:currentSlide, selector:selector });
        // gtag('event', 'slider_scroll', {	'event_category' : 'my_events', 'event_label':gtag_value});
        callback(currentSlide);
    });
}


function loading_html(){
    return `<div class="loading-container" ><img src="${GV.base_url}images/orange-loading.gif"/></div>`;
}


$(document).on('keyup','.form', function(e){
    if(e.keyCode == 13){      $(`#${$(this).data('id')}`).click();  }
});
    
    
    

//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
/////////////////////////    MAP    //////////////////////////////
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

$(document).on('click','.open-map', function(){
    fade_panel($('#map-panel'), true);
});

function set_place_name(address){
    // GV.place_name = address;
    $('.place-name').text(address);
}

function initialize_map($selector, latitude, longitude, zoom, is_clickable){
    const mapProp = {
        center:new google.maps.LatLng(latitude,longitude),
        zoom,
        streetViewControl:false,
        zoomControl: true,
        mapTypeControl: false,
        fullscreenControl: false,
        mapTypeId:google.maps.MapTypeId.ROADMAP
    };
    
    let map = new google.maps.Map($selector[0], mapProp);
    GV.map = map;

    let marker = new google.maps.Marker({position:new google.maps.LatLng(latitude, longitude)});

    marker.setMap(map);

    if(is_clickable != false){
        google.maps.event.addListener(map, 'click', async function(event) {
            marker.setPosition(event.latLng);
            GV.lati = event.latLng.lat();
            GV.longi = event.latLng.lng();
            const formatted_address = await get_formatted_place_name(GV.lati, GV.longi);
            set_place_name(formatted_address);
            search_for_products();
        });
    }

    let inputs = [$('#search-bar')[0], $('#map-panel-search')[0]];
    $.each(inputs, function(i,v){
        let autocomplete = new google.maps.places.Autocomplete(v, {componentRestrictions: {country: "dz"}});
        autocomplete.bindTo('bounds', map);
    
        autocomplete.addListener('place_changed', function() {
          let place = autocomplete.getPlace();
          if (!place.geometry) {  return; }
          set_place_name(place.formatted_address.replace(', Algérie','.').replace(', Algeria','.'));
          GV.lati = place.geometry.location.lat();
          GV.longi = place.geometry.location.lng();
       
          marker.setPosition(place.geometry.location);
          marker.setVisible(true);
          map.setCenter(place.geometry.location);
            
          search_for_products(() => {
              $.each(GV.suppliers, (i, sup) => {
                let marker = new google.maps.Marker({
                    position: new google.maps.LatLng(sup.content?.lati, sup.content?.longi),
                    icon: { url: 'images/marker-icon-blue.png' },
                    map
                });
              });
          });
        });
    });
}




function calculate_distance(lat1, lon1, lat2, lon2, unit) {
	if ((lat1 == lat2) && (lon1 == lon2)) {
		return 0;
	}
	else {
		var radlat1 = Math.PI * lat1/180;
		var radlat2 = Math.PI * lat2/180;
		var theta = lon1-lon2;
		var radtheta = Math.PI * theta/180;
		var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
		if (dist > 1) {
			dist = 1;
		}
		dist = Math.acos(dist);
		dist = dist * 180/Math.PI;
		dist = dist * 60 * 1.1515;
		if (unit=="km") { dist = dist * 1.609344 }
		return dist.toFixed(1);
	}
}




function getAddress (latitude, longitude) {
    return new Promise(function (resolve, reject) {
        let request = new XMLHttpRequest();
        let url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${API_KEY}&language=fr&sensor=true` ;
  
        request.open('GET', url, true);
        request.onreadystatechange = function () {
            if (request.readyState == 4) {
                if (request.status == 200) {
                    let data = JSON.parse(request.responseText);
                    let address = data.results[0];
                    resolve(address);
                }
                else {
                    reject(request.status);
                }
            }
        };
        request.send();
    });
};

  
async function save_user_location(){
    let {lat, lng} = await getLocation();
    GV.lati = lat; GV.longi = lng;
    const place_name = await get_formatted_place_name(lat, lng);
    set_place_name(place_name);
    initialize_map($('#my-map'),lat, lng, 16);
}

async function get_formatted_place_name(lat, lng){
    const {formatted_address} = await getAddress(lat, lng);
    return formatted_address.replace(', Algérie','.').replace(', Algeria','.');
}

function getLocation() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition( (pos) => {
        let {latitude, longitude} = pos.coords;
        resolve({lat:latitude, lng:longitude});
      }, reject);
    });
}




//////////////////////////////////////////////////////////////
/////////////////////      MISC      ////////////////////////
/////////////////////////////////////////////////////////////


function no_element_html(){
    return `<div class="gray" style="padding:40px 0px; text-align:center;">Aucun élément trouvé</div>`;
}


function replace_key(key, txt){
	if(txt == undefined){return "";}
	if(key == "" || key == undefined){return txt;}
	return txt.toLowerCase().replace(key.toLowerCase(), '<span class="c-red8">'+key+'</span>');
}

function confirm_action(txt, callback){
    GV.confirmation_callback=callback;
    $('#confirmation-popup').remove();

    var html=`
        <div id="confirmation-popup" class="popup-container">
            <div class="popup">
                <div class="popup-header">
                    Confirmation
                </div>
                <div class="popup-content">
                    ${txt}
                </div>
                <div class="popup-footer">
                    <div class="btn close-popup" style="opacity:0.7; width:40%; margin-right:3%;" >Annuler</div
                    ><div id="confirm-action" class="btn close-popup" style=" width:50%;">Confirmer</div>
                </div>
            </div>
        <div>
    `;

    $('body').append(html);
    $('#confirmation-popup').fadeIn().css('display','flex');
}


function expirationWarning(expiry_date){
    const daysUntilExpiration = moment(expiry_date).diff(moment(), "days");
    return  (daysUntilExpiration < 7)  ? "c-red8" : "c-orange7";
}

$(document).on('click','.close-popup', function(){
    $(this).closest('.popup-container').fadeOut();
});

$(document).on('click','#confirm-action', function(){
    GV.confirmation_callback();
    GV.confirmation_callback=function(){};
});



$(document).on('click', '.number-picker-btn', function () {
    var $parent = $(this).closest('.number-picker');
    var current_number = parseInt($parent.find('.number-picker-value').text());
    var max=$parent.data('max');
    var action=$(this).data('action');
    
    if ( action == "minus") {
        var new_number = current_number - 1;
        if (current_number < 1) { new_number = 0; }
    } else if( parseInt(max) > current_number) {
        var new_number = current_number + 1;
    }else{
        new_number=max;
    }
    $parent.find('.number-picker-value').text(new_number);
});


function number_picker_html(number_picker_id, initial_value, max_value){
    if(!initial_value){initial_value=0;}
    if(!max_value){max_value=999999;}
    return `<div id="${number_picker_id}" class="number-picker" data-max="${max_value}" style="background:RGBA(0,0,0,0.04);">
                <div class="number-picker-btn main-color" data-action="minus">-</div>
                <div class="number-picker-value">${initial_value}</div>
                <div class="number-picker-btn main-color" data-action="plus">+</div>
            </div>`;
}

function get_number_picker_value(number_picker_id){
   return $('#'+number_picker_id).find('.number-picker-value').text();
}

$(document).on('click', '.next-frame, .back-frame', function(){
    let $frame = $(this).closest('.frame');
    let index = $frame.index();
    if($(this).hasClass('skip-frame')){index++;}
    if($(this).hasClass('back-frame')){index=index-2;}

    if($frame.parent().find('.frame').eq(index).length == 0){return;}
    $frame.css('display','none');
    $frame.parent().find('.frame').eq(index).fadeIn();
});

$(document).on('click','.tab-button', function(){
    $(this).parent().find('.active-tab-button').removeClass('active-tab-button');
    $(this).toggleClass('active-tab-button');
});


function upload_image(file, callback){
    if(callback==undefined){callback=function(){};}
   
    let ajax = new XMLHttpRequest();
    $progress_bar = $('.upload-progress[data-file_id="'+file.name+''+file.lastModified+'"]');
    $progress_bar.parent().find('.image-name').val('');

	ajax.upload.addEventListener("progress", function (e) {
        var percent = (e.loaded / e.total) * 100;
        $progress_bar.html('('+Math.round(percent) + '%)');
	}, false);

	ajax.addEventListener("load", function (e) {
        let data = JSON.parse(e.target.response);
        $progress_bar.parent().find('.image-name').val(data.file_name);
        $progress_bar.remove();
    	callback(data, 'load');	
	}, false);

	ajax.addEventListener("error", function (e) {
        console.log(file.name, 'error');
		callback(e, 'error');
	}, false);

	ajax.addEventListener("abort", function (e) {
		console.log(file.name, 'Aborted');
		callback(e, 'abort');
	}, false);

	ajax.open("POST",  GV.base_url+'uploads');

	var formData = new FormData();
    formData.append('file', file);
	ajax.send(formData);
}


async function uploadImage(file){
    const formData = new FormData();
    formData.append('file', file);

    $progress_bar = $('.upload-progress[data-file_id="'+file.name+''+file.lastModified+'"]');
    $progress_bar.parent().find('.image-name').val('');

    let data = await $.ajax({
        url: '/uploads',  type: 'POST',
        data: formData,
        processData: false, contentType: false,
        xhr: function() {
            const xhr = new window.XMLHttpRequest();
            xhr.upload.addEventListener("progress", function(e) {
                if (e.lengthComputable) {
                    $progress_bar.html('('+Math.round(100 * (e.loaded / e.total)) + '%)');
                }
           }, false);
    
           return xhr;
        },
    });

    $progress_bar.parent().find('.image-name').val(data.file_name);
    $progress_bar.remove();
    return data;
}


function back() {
    if ($(".active-panel").length)
        fade_panel($(".active-panel"), false);
    else{
        confirm_action('Etes-vous sûr de vouloir quitter l\'application?', () => {
            android.quitApp();
        });
    }
}


function scroll_to_top($selector){
    $selector.animate({  scrollTop:0 }, 'fast');
}

Array.prototype.findBy = function (i, v, child) {
    return (child != undefined)
    ? this.filter(o=>o.hasOwnProperty(child) && o[child]!=null && o[child][i] == v)
    : this.filter(o=>o[i] == v);
};