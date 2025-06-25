document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const subcategoryId = urlParams.get("subcategoryId");
  const locationId = urlParams.get("locationId") || localStorage.getItem("selectedLocationID");

  document.getElementById("subcategoryId").value = subcategoryId || "";

  const form = document.getElementById("addProductForm");
  const statusMsg = document.getElementById("statusMsg");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!locationId) {
      alert("Location ID is missing. Please try again.");
      return;
    }

    const formData = new FormData();

    formData.append("subcategoryId", document.getElementById("subcategoryId").value);
    formData.append("locationId", locationId);
    formData.append("supplierId", document.getElementById("supplierId").value);
    formData.append("name", document.getElementById("name").value);
    formData.append("price", parseFloat(document.getElementById("price").value));
    formData.append("stockQty", parseInt(document.getElementById("stockQty").value));
    formData.append("stockUpdate", parseInt(document.getElementById("stockUpdate").value));
    formData.append("expiryDate", document.getElementById("expiryDate").value);
    formData.append("details", document.getElementById("details").value);

    // 👇 Append the selected file (if any)
    const productImage = document.getElementById("productImage").files[0];
    if (productImage) {
      formData.append("productImage", productImage);
    }

    fetch("/add-product", {
      method: "POST",
      body: formData
    })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        statusMsg.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
        form.reset();
      } else {
        statusMsg.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
      }
    })
    .catch((err) => {
      console.error("Error:", err);
      statusMsg.innerHTML = `<div class="alert alert-danger">Error adding product</div>`;
    });
  });

  // Close button logic
  document.getElementById("closeBtn").addEventListener("click", () => {
    window.history.back();
  });
});
