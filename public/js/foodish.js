document.addEventListener("DOMContentLoaded", function () {
    async function fetchRandomFoodImage() {
        try {
            const response = await fetch("https://foodish-api.com/api/");
            const data = await response.json();
            if (data.image) {
                document.getElementById("food-image").src = data.image;
            } else {
                console.error("No image found in response:", data);
            }
        } catch (error) {
            console.error("Error fetching food image:", error);
        }
    }

    document.getElementById("get-food-image").addEventListener("click", fetchRandomFoodImage);
});