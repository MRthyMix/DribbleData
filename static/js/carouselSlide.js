$(document).ready(function(){
    var $slider = $('.carousel-slide');

    $slider.slick({
      slidesToShow: 5,
      slidesToScroll: 1,
      autoplay: true,
      autoplaySpeed: 0,
      speed: 3000,
      cssEase: 'linear',
      arrows: true,
      infinite: true,
      pauseOnHover: false,
      pauseOnFocus: false,
    });
  });
