document.addEventListener("DOMContentLoaded", function () {
    let time = parseInt(document.getElementById("timer").dataset.time);
    const timerElem = document.getElementById("timer");

    const interval = setInterval(() => {
        time--;
        timerElem.innerText = time;
        if (time <= 0) {
            clearInterval(interval);
            document.forms[0].submit();
        }
    }, 1000);
});