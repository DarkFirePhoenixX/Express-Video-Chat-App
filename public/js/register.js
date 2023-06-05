
document.getElementById('submitRegister').addEventListener('click',(e) => {
    if(document.getElementById('passwordField').value != document.getElementById('repeatPassword').value){
        e.preventDefault();
    }
})

if(document.querySelector('.error') != null){
document.querySelector('.error').style.opacity = fadeOutEffect()

function fadeOutEffect() {
    var fadeTarget = document.querySelector('.error');
    var fadeEffect = setInterval(function () {
        if (!fadeTarget.style.opacity) {
            fadeTarget.style.opacity = 1;
        }
        if (fadeTarget.style.opacity > 0) {
            fadeTarget.style.opacity -= 0.1;
        } else {
            document.querySelector('.error').remove();
            clearInterval(fadeEffect);
        }
    }, 200);
}
}