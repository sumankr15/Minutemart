async function getCartProductIds() {
  try {
    const res = await fetch("/cart-items", {
      method: "GET",
      credentials: "include"
    });

    if (!res.ok) {
      console.error("❌ Unauthorized or server error");
      return [];
    }

    const cartItems = await res.json();

    if (!Array.isArray(cartItems)) {
      console.error("❌ Invalid cart items response", cartItems);
      return [];
    }

    return cartItems.map(item => item.Product_ID);
  } catch (err) {
    console.error("❌ Failed to fetch cart items", err);
    return [];
  }
}


async function addProductToCart(productId, buttonEl = null) {
  try {
    const res = await fetch("/add-to-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ productId })
    });

    const result = await res.json();

    if (result.success) {
      alert("🛒 Added to cart!");
      updateCartCountUI();

      if (buttonEl) {
        const newBtn = buttonEl.cloneNode(true);
        newBtn.textContent = "🛒 Go to Cart";
        newBtn.classList.add("go-to-cart");
        newBtn.addEventListener("click", () => {
          // window.location.href = "/cart.html";
          loadCartPage();
        });

        buttonEl.replaceWith(newBtn);
      }
    } else {
      alert("❌ Failed: " + result.message);
      if (result.message === "Not logged in") {
        window.location.href = "/login_register.html";
      }
    }
  } catch (err) {
    console.error("Error adding to cart:", err);
  }
}

async function updateCartCountUI() {
  try {
    const res = await fetch("/cart-count");
    const { count } = await res.json();

    const cartCountSpan = document.getElementById("cartCount");
    if (count > 0) {
      cartCountSpan.textContent = count;
      cartCountSpan.style.display = "inline-block";
    } else {
      cartCountSpan.style.display = "none";
    }
  } catch (e) {
    console.error("Error fetching cart count", e);
  }
}

function initProductDetail() {
  const productId = localStorage.getItem("selectedProductId");
  console.log("here", productId);

  if (!productId) {
    console.error("❌ No product ID found in localStorage.");
    return;
  }

  fetch(`/getProductDetail?product_id=${productId}`)
    .then(res => res.json())
    .then(product => {
      console.log(product);

      document.querySelector(".product-title").textContent = product.ProductName;
      document.querySelector(".product-detail").textContent = product.Detail || "No details provided.";
      document.querySelector(".product-image").src = `/uploads/products/${product.Product_Image || "default.jpg"}`;
      document.querySelector(".product-image").alt = product.ProductName || "Product Image";
      document.querySelector(".product-price").textContent = `Price: ₹${product.Price}`;
      document.querySelector(".product-expiry").textContent = `Expiry: ${product.Expiry_Date || "N/A"}`;

      const quantity = parseInt(product.Stock_Quantity, 10);
      const updateThreshold = parseInt(product.Stock_Update, 10);
      const quantityEl = document.querySelector(".product-quantity");
      quantityEl.textContent = `Available Quantity: ${quantity}`;




      const existingStockStatus = document.querySelector(".product-stock");
if (existingStockStatus) existingStockStatus.remove();
      const stockStatus = document.createElement("p");
      stockStatus.classList.add("product-stock");

      if (quantity === 0) {
        stockStatus.textContent = "Out of Stock ❌";
        stockStatus.style.color = "red";
      } else if (quantity < updateThreshold) {
        stockStatus.textContent = "Low Stock ⚠️";
        stockStatus.style.color = "orange";
      } else {
        stockStatus.textContent = "In Stock ✅";
        stockStatus.style.color = "green";
      }

      quantityEl.after(stockStatus);

      document.querySelector(".supplier-name").textContent = `Supplier: ${product.SupplierName}`;
      document.querySelector(".supplier-address").textContent = `Address: ${product.SupplierAddress}`;

      // Add to cart button logic based on actual cart status
      getCartProductIds().then(cartProductIds => {
        const addToCartBtn = document.querySelector(".add-to-cart-btn");
        const newBtn = addToCartBtn.cloneNode(true); // Cloning removes old listeners
      
        if (cartProductIds.map(String).includes(productId)) {
          newBtn.textContent = "🛒 Go to Cart";
          newBtn.classList.add("go-to-cart");
          newBtn.addEventListener("click", () => {
            // window.location.href = "/cart.html";
            loadCartPage();
          });
        } else {
          newBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            addProductToCart(productId, newBtn);
          });
        }
      
        addToCartBtn.replaceWith(newBtn); // Replacing the old button with the new one
      });
      
      

    })
    .catch(err => {
      console.error("❌ Failed to fetch product detail:", err);
    });
}
function loadCartPage() {
  console.log("🛒 Loading cart page...");

  fetch("cart.html")
    .then(res => res.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const cartMain = doc.querySelector("main");

      if (cartMain) {
        document.querySelector("main").innerHTML = cartMain.innerHTML; // Inject cart content here

        // Optional: Load cart.css
        if (!document.querySelector('link[href="css/cart.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "css/cart.css";
          document.head.appendChild(link);
        }

        // Optional: Load cart.js
        const script = document.createElement("script");
        script.src = "cart.js";
        script.onload = () => {
          if (typeof fetchCartItems === "function") {
            fetchCartItems(); // Initialize the cart page
            console.log("✅ Cart page loaded.");
          }
        };
        document.body.appendChild(script);
      } else {
        console.warn("⚠️ <main> tag not found in cart.html.");
      }
    })
    .catch(err => console.error("❌ Error loading cart page:", err));
}


// Start
initProductDetail();


document.getElementById("goBackBtn")?.addEventListener("click", () => {
  window.location.href = "welcome.html"; // Redirect to the welcome page
});