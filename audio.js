const image = document.querySelector(".cat-profile");
const audio = document.getElementById("hover-audio");

image.addEventListener("mouseenter", () => {
  audio.currentTime = 0;
  audio.play();
});

image.addEventListener("mouseleave", () => {
  audio.pause();
  audio.currentTime = 0;
});
