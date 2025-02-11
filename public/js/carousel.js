document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('.carousel').forEach(carousel => {
        let index = 0;
        const images = carousel.querySelectorAll('.carousel-image');

        function showNextImage() {
            images.forEach(img => img.style.display = "none");
            images[index].style.display = "block";
            index = (index + 1) % images.length;
        }

        showNextImage(); // Show the first image initially
        setInterval(showNextImage, 3000); // Rotate images every 3 seconds
    });
});