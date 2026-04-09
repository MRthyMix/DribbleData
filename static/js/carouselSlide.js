$(document).ready(function(){
    var $slider = $('.carousel-slide');

    $slider.slick({
      slidesToShow: 5,
      slidesToScroll: 1,
      autoplay: true,
      autoplaySpeed: 1,
      speed: 10000,
      cssEase: 'ease-in-out',
      arrows: true,
      infinite: true,
      pauseOnHover: true,
    });

    function styleSlides(slickObj) {
      const start = slickObj.currentSlide;
      slickObj.$slides.css({ opacity: 0.2, transform: 'scale(1)' });

      [1,2,3].forEach(offset => {
        const idx = start + offset;
        $(slickObj.$slides.get(idx)).css({
          opacity: 1,
          transform: 'scale(1.05)'
        });
      });
    }

    $slider.on('afterChange', (e, slick) => styleSlides(slick));
    styleSlides($slider.slick('getSlick'));
  });
