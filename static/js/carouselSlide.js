$(document).ready(function(){
    var $slider = $('.carousel-slide');
    var mouseDownX = 0;
    var mouseDownY = 0;
    window.sliderDragged = false;

    $slider.on('mousedown touchstart', function(e) {
        var point = e.touches ? e.touches[0] : e;
        mouseDownX = point.clientX;
        mouseDownY = point.clientY;
        window.sliderDragged = false;
    });

    $slider.on('mouseup touchend', function(e) {
        var point = e.changedTouches ? e.changedTouches[0] : e;
        var dx = Math.abs(point.clientX - mouseDownX);
        var dy = Math.abs(point.clientY - mouseDownY);
        if (dx > 5 || dy > 5) {
            window.sliderDragged = true;
            setTimeout(function() { window.sliderDragged = false; }, 100);
        }
    });

    $slider.on('wheel', function(e) {
        e.preventDefault();
        if (e.originalEvent.deltaY < 0 || e.originalEvent.deltaX < 0) {
            $slider.slick('slickPrev');
        } else {
            $slider.slick('slickNext');
        }
    });

    $slider.slick({
      slidesToShow: 5,
      slidesToScroll: 1,
      autoplay: true,
      autoplaySpeed: 2000,
      speed: 600,
      cssEase: 'ease-in-out',
      arrows: true,
      infinite: true,
      pauseOnHover: false,
      pauseOnFocus: false,
      swipe: true,
      draggable: true,
      swipeToSlide: true,
      touchThreshold: 10,
    });
  });
