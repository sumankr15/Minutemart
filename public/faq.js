// FAQ Dropdown functionality with smooth opening/closing and purple border
const questions = document.querySelectorAll(".faq-question");

questions.forEach((question) => {
  question.addEventListener("click", () => {
    // Close any open question
    const active = document.querySelector(".faq-item.active");
    if (active && active !== question.closest(".faq-item")) {
      active.classList.remove("active");
      active.querySelector(".faq-answer").classList.remove("open");
    }

    // Toggle current question
    const faqItem = question.closest(".faq-item");
    faqItem.classList.toggle("active");
    const answer = faqItem.querySelector(".faq-answer");
    answer.classList.toggle("open");
  });
});

// Search filter logic
const searchInput = document.querySelector(".search-bar input");

searchInput.addEventListener("input", () => {
  const keyword = searchInput.value.toLowerCase();
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");
    const questionText = question.textContent.toLowerCase();
    const answerText = answer.textContent.toLowerCase();

    if (keyword === "") {
      // Reset all
      item.style.display = "block";
      question.classList.remove("active");
      answer.classList.remove("open");
    } else if (questionText.includes(keyword) || answerText.includes(keyword)) {
      item.style.display = "block";
      question.classList.add("active");
      answer.classList.add("open");
    } else {
      item.style.display = "none";
      question.classList.remove("active");
      answer.classList.remove("open");
    }
  });
});
function logout() {
    fetch('/logout', {
      method: 'POST',
      credentials: 'include'
    })
    .then(res => {
      if (res.ok) {
        localStorage.removeItem('deliveryEmail');
        window.location.href = '/login_register.html';
      } else {
        alert('Logout failed.');
      }
    })
    .catch(err => {
      console.error("Logout error:", err);
      alert('An error occurred during logout.');
    });
  }
  document.getElementById("goBackBtn")?.addEventListener("click", () => {
    window.location.href = "welcome.html"; // Redirect to the welcome page
  });