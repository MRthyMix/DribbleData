$(document).ready(function(){
    var $slider = $('.carousel-slide');

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
