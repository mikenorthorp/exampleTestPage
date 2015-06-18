document.getElementById('hamburger-menu').onclick=function(){
    var mobilelinks = document.getElementsByClassName("hide-mobile");
    var hamburgerbutton = document.getElementById('hamburger-menu');
    if(hamburgerbutton.className == 'hamburger-menu') {
    	hamburgerbutton.className ='hamburger-clicked';
    	for (var i = 0; i < mobilelinks.length; i++) {
        	mobilelinks[i].style.display = 'block';
    	}
    } else {
    	hamburgerbutton.className ='hamburger-menu';
    	for (var j = 0; j < mobilelinks.length; j++) {
        	mobilelinks[j].style.display = 'none';
    	}
    }
};