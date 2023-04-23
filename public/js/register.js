// document.getElementById('nameField').addEventListener('focus',() => {
//     document.getElementById('nameField').placeholder = ""
// })
// document.getElementById('nameField').addEventListener('blur',() => {
//     document.getElementById('nameField').placeholder = "Enter your username"
// })
// document.getElementById('emailField').addEventListener('focus',() => {
//     document.getElementById('emailField').placeholder = ""
// })
// document.getElementById('emailField').addEventListener('blur',() => {
//     document.getElementById('emailField').placeholder = "Enter your email address"
// })
// document.getElementById('passwordField').addEventListener('focus',() => {
//     document.getElementById('passwordField').placeholder = ""
// })
// document.getElementById('passwordField').addEventListener('blur',() => {
//     document.getElementById('passwordField').placeholder = "Enter your password"
// })
// document.getElementById('repeatPassword').addEventListener('focus',() => {
//     document.getElementById('repeatPassword').placeholder = ""
// })
// document.getElementById('repeatPassword').addEventListener('blur',() => {
//     document.getElementById('repeatPassword').placeholder = "Enter your password"
// })
// document.getElementById('submitRegister').addEventListener('click',(e) => {
//     if(!document.getElementById('passwordField').value == document.getElementById('repeatPassword').value){
//         e.preventDefault();
//     }
// })

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