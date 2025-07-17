$(window).on('load', function(){
        bgColor: '#7d7c6a'
    });
});

// Плавная прокрутка при клике на scroll-indicator
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('.scroll-indicator').forEach(el => {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = el.getAttribute('href');
      const target = document.querySelector(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});


// Плавная прокрутка для scroll-indicator (DOM loaded)
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.scroll-indicator').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      var target = document.querySelector(el.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});
