document.addEventListener("DOMContentLoaded", function () {
    const langSwitcher = document.getElementById("languageSwitcher");
    langSwitcher.addEventListener("change", function () {
        const selectedLang = langSwitcher.value;
        localStorage.setItem("lang", selectedLang);
        const url = new URL(window.location.href);
        url.searchParams.set("lang", selectedLang);
        window.location.href = url.toString();
    });

    const storedLang = localStorage.getItem("lang");
    if (storedLang) {
        langSwitcher.value = storedLang;
    }
});