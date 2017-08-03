
$(function() {
   var music = document.getElementById("music");
   var loading = $('.loading-container');
   //加载图片列表
   var imgList = [
     '../img/page1-logo-telpay.png',
     '../img/page1-logo-telecon.png',
     '../img/page1-bg-decoretion.png',
     '../img/page1-bg-clound.png',
     '../img/page1-bg-orange.png',
     '../img/page1-title-recriment.png',

   ];
   var list = $('.container .pagelist').pagesBox({
     pages: 'section', //pages selector name
   });
   list.on("gopage", function(e, to, from) {
     $('section').eq(from).toggleClass('active');
     $('section').eq(to).toggleClass('active');
   });


   loading.css('display', 'none');
       $('section').eq(0).addClass('active');
   function imgPreload(imgArr, callback) {
     var solvedNum = imgArr.length;
     imgArr.forEach(function(v, i) {
       var img = new Image();
       img.src = v;
       if (img.complete) { //如果图片已经存在于浏览器缓存，直接调用回调函数
         checkSolved();
         return; // 直接返回，不用再处理onload事件
       }
       img.onload = function() {
         checkSolved();
       };
     });

     function checkSolved() {
       solvedNum--;
       if (solvedNum == 0) {
         callback && callback();
       }
     }
   }



  
 });
 



$('.ele').click(function () {
	var ele_name = null;
 	ele_name = $(this).attr('data-means');
	$('.'+ele_name).parent().show();
	$(this).parent().append('<img src="img/close.png" class="close-btn" data-means="'+ele_name+'" onclick="close"/>');
//绑定点击关闭事件	
		$('.close-btn').click(function () {
		var ele_name = null;
		ele_name = $(this).attr('data-means');
		$('.'+ele_name).parent().hide();
		$(this).remove();
	})
});
