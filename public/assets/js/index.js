
$('input[type=radio][name=exampleRadio]').change(function () {
  if (this.value == 'option1') {
    $('.price-input').addClass('hide-class')
  }
  else if (this.value == 'option2') {
    $('.price-input').removeClass('hide-class')
  }
});

var isChecked = $('#paidRadio:checked').val() ? true : false;
if (isChecked) {
  $('.price-input').removeClass('hide-class');
}

const defaultBtn = document.getElementById('defaultBtn');
const uploadBtn = document.getElementById('uploadBtn');
function btnActive() {

  defaultBtn.click();
}

document.querySelector("input[type=file][name=lesson-video]").onchange = function (event) {
  let file = event.target.files[0];
  let blobURL = URL.createObjectURL(file);
  var p = document.getElementById("alertParagraph");
  console.log(file.size / 1048576);
  if (file.size / 1048576 > 100) {
    p.textContent = '*File size is larger than 100mb';

  } else {
    p.textContent = '';
    document.querySelector("#uploaded-video").src = blobURL;
  }

}

const imageSrc = document.querySelector('#userImageOutput');
const inputTag = document.querySelector('#userImageInput');

console.log(inputTag);

inputTag.addEventListener('change', readImage)

function readImage(event) {
  if (event.target.files && event.target.files[0]) {
    var reader = new FileReader();

    reader.onload = function (e) {
      console.log('loaded')
      imageSrc = e.target.result
      videoTag.load()
    }.bind(this)

    reader.readAsDataURL(event.target.files[0]);
  }
}


