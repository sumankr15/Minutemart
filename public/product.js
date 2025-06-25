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
function initProductPage() {
  const subcategoryId = localStorage.getItem("currentSubcategoryId");
  const pincode = localStorage.getItem("currentPincode");

  if (!pincode || !subcategoryId) {
    console.error("❌ Missing pincode or subcategory ID.");
    return;
  }

  fetch(`/getLocationByPincode?pincode=${pincode}`)
    .then(res => res.json())
    .then(data => {
      if (!data || !data.location_id) {
        throw new Error("❌ Location ID not found.");
      }

      const locationId = data.location_id;

      return fetch(`/getProductsBySubcategoryAndLocation?subcategory_id=${subcategoryId}&location_id=${locationId}`);
    })
    .then(res => res.json())
    .then( async products => {
      const cartProductIds = await getCartProductIds();
      const container = document.querySelector(".product-container");
      const template = container.querySelector(".template-product");

      products.forEach(product => {
        const clone = template.cloneNode(true);
        clone.classList.remove("template-product");
        clone.style.display = "block";
        clone.setAttribute("data-product-id", product.Product_ID);
      
        clone.querySelector(".product-image").src = `/uploads/products/${product.Product_Image || "default.jpg"}`;
        clone.querySelector(".product-image").alt = product.Name;
        clone.querySelector(".product-name").textContent = product.Name;
        clone.querySelector(".product-price").textContent = `₹${product.Price}`;
      
        const btn = clone.querySelector(".add-to-cart-btn");
      
        if (cartProductIds.includes(product.Product_ID)) {
          // ✅ Already in cart
          btn.textContent = "🛒 Go to Cart";
          btn.classList.add("go-to-cart");
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            // window.location.href = "/cart.html";
            loadCartPage();
          });
        } else {
          // 🛒 Add to Cart button behavior
          btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            try {
              const res = await fetch("/add-to-cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({ productId: product.Product_ID })
              });
            
              const result = await res.json();
            
              if (result.success) {
                alert("🛒 Added to cart!");
            
                const newBtn = btn.cloneNode(true);
                newBtn.textContent = "🛒 Go to Cart";
                newBtn.classList.add("go-to-cart");
                newBtn.addEventListener("click", () => {
                  // window.location.href = "/cart.html";
                  loadCartPage();
                });
            
                btn.replaceWith(newBtn);
                updateCartCountUI();
              } else {
                alert("❌ Failed: " + result.message);
                if (result.message === "Not logged in") {
                  window.location.href = "/login_register.html";
                }
              }
            } catch (error) {
              console.error("❌ Error:", error);
              alert("Something went wrong. Please try again.");
            }
            //  catch (err) {
            //   console.error("Error adding to cart:", err);
            // }
          });
        }
      
        // 🧭 Navigate to product detail
        clone.addEventListener("click", (e) => {
          if (e.target.classList.contains("add-to-cart-btn") || e.target.classList.contains("go-to-cart")) return;
          handleProductClick(product.Product_ID);
        });
      
        container.appendChild(clone);
      });
    })      
    .catch(err => console.error("❌ Failed to load products:", err));
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




function handleProductClick(productId) {
  console.log("🛒 Product clicked:", productId);
  localStorage.setItem("selectedProductId", productId);

  fetch("product-detail.html")
    .then(res => res.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const detailMain = doc.querySelector("main");

      if (detailMain) {
        document.querySelector("main").innerHTML = detailMain.innerHTML;

        // Load product-detail.css
        if (!document.querySelector('link[href="css/product-detail.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "css/product-detail.css";
          document.head.appendChild(link);
        }

        // Load product-detail.js
        const script = document.createElement("script");
        script.src = "product-detail.js";
        script.onload = () => {
          if (typeof initProductDetail === "function") {
            initProductDetail(productId);
            console.log("✅ Product detail page initialized.");
          }
        };
        document.body.appendChild(script);
      } else {
        console.warn("⚠️ <main> tag not found in product-detail.html.");
      }
    })
    .catch(err => console.error("❌ Error loading product detail page:", err));
}


// 🛒 Add product to cart
// 🛒 Reusable function to add product to cart
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
          window.location.href = "/cart.html";
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

// Optional: load on page load
document.addEventListener("DOMContentLoaded", () => {
  initProductPage();
  updateCartCountUI();
});

document.getElementById("goBackBtn")?.addEventListener("click", () => {
  window.location.href = "welcome.html"; // Redirect to the welcome page
});