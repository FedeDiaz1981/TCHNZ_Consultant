/* DESCRIPTION: CUSTOM JS FILE */

const navbar = document.getElementById("navbar");
const navLinks = document.querySelectorAll(".nav-link:not(.dropdown-toggle)");
const navToggler = document.querySelector(".navbar-toggler");
const offcanvas = document.querySelector(".offcanvas-collapse");
const backToTop = document.getElementById("myBtn");
const floatingActions = document.querySelector(".floating-actions");

function updateNavbar() {
  const intViewportWidth = window.innerWidth;
  if (!navbar) return;

  if (
    (document.body.scrollTop > 30 || document.documentElement.scrollTop > 30) &&
    intViewportWidth > 991
  ) {
    navbar.classList.add("top-nav-collapse");
  } else if (
    (document.body.scrollTop < 30 || document.documentElement.scrollTop < 30) &&
    intViewportWidth > 991
  ) {
    navbar.classList.remove("top-nav-collapse");
  }

  updateNavHeight();
}

function updateNavHeight() {
  if (!navbar) return;
  const height = Math.ceil(navbar.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--nav-height", `${height}px`);
}

function toggleOffcanvas() {
  if (!offcanvas) return;
  offcanvas.classList.toggle("open");
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (offcanvas?.classList.contains("open")) {
      offcanvas.classList.remove("open");
    }
  });
});

navToggler?.addEventListener("click", toggleOffcanvas);

function scrollFunctionBTT() {
  if (!floatingActions) return;
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    floatingActions.style.display = "flex";
  } else {
    floatingActions.style.display = "none";
  }
}

function topFunction() {
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}

window.topFunction = topFunction;

window.addEventListener("scroll", () => {
  updateNavbar();
  scrollFunctionBTT();
});

function initAOSFallback() {
  document.querySelectorAll("[data-aos]").forEach((el) => {
    el.classList.add("aos-init", "aos-animate");
  });
}

function initAOS() {
  if (!window.AOS) return false;
  window.AOS.init({
    duration: 1000,
    easing: "ease",
    once: true
  });
  return true;
}

function initAboutSequence() {
  const aboutSection = document.getElementById("about");
  if (!aboutSection) return;
  if (aboutSection.dataset.animateBound === "true") return;
  aboutSection.dataset.animateBound = "true";

  if (!("IntersectionObserver" in window)) {
    aboutSection.classList.add("about-animate");
    return;
  }

  const rect = aboutSection.getBoundingClientRect();
  if (rect.top < window.innerHeight && rect.bottom > 0) {
    aboutSection.classList.add("about-animate");
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          aboutSection.classList.add("about-animate");
          observer.disconnect();
        }
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
  );

  observer.observe(aboutSection);
}

window.addEventListener("load", () => {
  updateNavbar();
  scrollFunctionBTT();
  updateNavHeight();
  if (!initAOS()) {
    // If AOS didn't load, show content after load to avoid hidden sections.
    initAOSFallback();
  }
  initAboutSequence();
});

window.addEventListener("resize", () => {
  updateNavHeight();
});
