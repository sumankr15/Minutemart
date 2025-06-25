console.log("🛒 cart.js loaded");

// Load cart items for authenticated user
async function fetchCartItems() {
  try {
    const res = await fetch("/cart-items", { credentials: "include" });
    const items = await res.json();

    if (!Array.isArray(items) || items.length === 0) {
      document.getElementById("emptyCartMessage").style.display = "block";
      return;
    }

    const container = document.getElementById("cartContainer");
    let total = 0;

    items.forEach(item => {
      const itemEl = document.createElement("div");
      itemEl.classList.add("cart-item");

      total += item.Price * item.Quantity;

      itemEl.innerHTML = `
        <img src="/uploads/products/${item.Product_Image || 'default.jpg'}" alt="${item.Name}" />
        <div class="item-info">
          <h3 class="item-name">${item.Name}</h3>
          <p class="item-price">₹${item.Price}</p>
        </div>
        <div class="quantity-controls" data-product-id="${item.Product_ID}">
          <button class="decrease-btn">➖</button>
          <span class="quantity">${item.Quantity}</span>
          <button class="increase-btn">➕</button>
        </div>
      `;

      container.appendChild(itemEl);
    });

    document.getElementById("itemTotal").textContent = total.toFixed(2);
    document.getElementById("cartSummary").style.display = "block";

    attachQuantityListeners();
    updateTotalAmount();
  } catch (err) {
    console.error("❌ Failed to fetch cart items:", err);
  }
}

// Quantity button listeners
function attachQuantityListeners() {
  document.querySelectorAll(".quantity-controls").forEach(ctrl => {
    const productId = ctrl.getAttribute("data-product-id");
    const quantitySpan = ctrl.querySelector(".quantity");

    ctrl.querySelector(".increase-btn").addEventListener("click", () => {
      updateQuantity(productId, 1, quantitySpan);
    });

    ctrl.querySelector(".decrease-btn").addEventListener("click", () => {
      updateQuantity(productId, -1, quantitySpan);
    });
  });
}

// Update quantity logic
async function updateQuantity(productId, change, quantitySpan) {
  try {
    const res = await fetch("/update-cart-quantity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId, change })
    });

    const result = await res.json();

    if (result.success) {
      const newQty = result.newQuantity;

      if (newQty <= 0) {
        location.reload();
      } else {
        quantitySpan.textContent = newQty;
        updateTotalAmount();
      }

      updateCartCountUI?.(); // Optional: update cart badge count
    } else {
      alert("❌ " + result.message);
    }
  } catch (err) {
    console.error("Error updating quantity:", err);
  }
}

// Calculate and display all totals
function updateTotalAmount() {
  let total = 0;

  document.querySelectorAll(".cart-item").forEach(item => {
    const price = parseFloat(item.querySelector(".item-price").textContent.replace("₹", ""));
    const quantity = parseInt(item.querySelector(".quantity").textContent);
    total += price * quantity;
  });

  const itemTotal = total;
  let cartFee = itemTotal < 199 ? 35 : 0;
  let deliveryFee = itemTotal < 200 ? 30 : 0;

  const totalToPay = itemTotal + cartFee + deliveryFee;

  document.getElementById("itemTotal").textContent = itemTotal.toFixed(2);
  document.getElementById("smallCartFee").textContent = cartFee;
  document.getElementById("deliveryFee").textContent = deliveryFee;
  document.getElementById("totalToPay").textContent = totalToPay.toFixed(2);

  document.getElementById("cartFeeRow").style.display = "block";
  document.getElementById("deliveryFeeRow").style.display = "block";

  if (itemTotal < 200) {
    document.getElementById("freeDeliveryNote").hidden = false;
    document.getElementById("remainingForFreeDelivery").textContent = (200 - itemTotal).toFixed(2);
  } else {
    document.getElementById("freeDeliveryNote").hidden = true;
  }
}

// Track if user visited cart
document.addEventListener("DOMContentLoaded", () => {
  const wasInCart = localStorage.getItem("lastView") === "cart";

  if (wasInCart || window.location.pathname === "/cart") {
    fetchCartItems();
  }

  document.getElementById("openCartBtn")?.addEventListener("click", () => {
    localStorage.setItem("lastView", "cart");
  });

  document.getElementById("goHomeBtn")?.addEventListener("click", () => {
    localStorage.removeItem("lastView");
  });
});

// Place Order → Check Address → Redirect to address.html
document.getElementById('placeOrderBtn').addEventListener('click', function () {
  const userId = localStorage.getItem('userId');

  if (!userId) {
    alert('User not logged in!');
    return;
  }

  fetch(`/api/checkAddress/${userId}`)
    .then(res => res.json())
    .then(data => {
      if (data.exists) {
        // ✅ Address exists: open in edit mode
        window.location.href = `address.html?userId=${userId}&edit=true`;
        // Change button text to 'Pay'
        document.getElementById("placeOrderBtn").textContent = "Pay";
      } else {
        // 🚫 No address: open form to add new address
        window.location.href = `address.html?userId=${userId}`;
      }
    })
    .catch(err => {
      console.error('Error checking address:', err);
    });
});


document.getElementById("goBackBtn")?.addEventListener("click", () => {
  window.location.href = "welcome.html"; // Redirect to the welcome page
});
