function initShopPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const pincode = urlParams.get("pincode") || localStorage.getItem("userPincode");

  if (!pincode) {
    console.warn("⚠️ Pincode not found.");
    return;
  }

  fetch(`/getCategoriesByPincode?pincode=${pincode}`)
    .then((res) => res.json())
    .then((categories) => {
      const mainContainer = document.querySelector(".category-container");
      const templateCard = document.querySelector(".template-card");
      const subTemplate = document.querySelector(".template-subcard");

      if (!mainContainer || !templateCard || !subTemplate) {
        console.warn("❌ Required templates or container not found.");
        return;
      }

      mainContainer.innerHTML = ""; // ✅ Clear previous content

      const renderedCategoryIds = new Set(); // ✅ To avoid duplicates

      categories.forEach((category) => {
        if (renderedCategoryIds.has(category.Category_ID)) return;
        renderedCategoryIds.add(category.Category_ID);

        const categoryWrapper = document.createElement("div");
        categoryWrapper.classList.add("category-wrapper");

        const card = templateCard.cloneNode(true);
        card.classList.remove("template-card");
        card.style.display = "block";
        card.querySelector(".category-name").textContent = category.Category_Name;

        categoryWrapper.appendChild(card);

        const subcategoryRow = document.createElement("div");
        subcategoryRow.classList.add("subcategory-row");

        fetch(`/getSubcategoriesByCategoryAndPincode?category_id=${category.Category_ID}&pincode=${pincode}`)
          .then((res) => res.json())
          .then((subcategories) => {
            subcategories.forEach((sub) => {
              const subcard = subTemplate.cloneNode(true);
              subcard.classList.remove("template-subcard");
              subcard.style.display = "inline-block";

                console.log(sub.subcategoryId);
              //click event handler
              subcard.addEventListener("click", () => {
                localStorage.setItem("selectedSubcategoryId", sub.Subcategory_ID);
                localStorage.setItem("userPincode", pincode);
              
                loadProductPage(pincode, sub.Subcategory_ID);
              });
              

              const img = subcard.querySelector(".subcategory-image");
              const subName = subcard.querySelector(".subcategory-name");

              img.src = `/uploads/subcategories/${sub.Subcategory_Image || "default.jpg"}`;
              img.alt = sub.Subcategory_Name;
              subName.textContent = sub.Subcategory_Name;

              subcategoryRow.appendChild(subcard);
            });

            categoryWrapper.appendChild(subcategoryRow);
          })
          .catch((err) => console.error("❌ Error fetching subcategories:", err));

        mainContainer.appendChild(categoryWrapper);
      });
    })
    .catch((err) => console.error("❌ Error loading categories:", err));
}

function loadCartPage() {
  fetch("cart.html")
    .then(res => res.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const cartMain = doc.querySelector("main");

      if (cartMain) {
        document.querySelector("main").innerHTML = cartMain.innerHTML;

        // Load cart.css if not already loaded
        if (!document.querySelector('link[href="css/cart.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "css/cart.css";
          document.head.appendChild(link);
        }

        // Load cart.js
        const script = document.createElement("script");
        script.src = "cart.js";
        script.onload = () => {
          if (typeof fetchCartItems === "function") {
            fetchCartItems();
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

//load product page 
function loadProductPage(pincode, subcategoryId) {
    // ✅ Save pincode and subcategoryId to localStorage
    console.log(subcategoryId);
localStorage.setItem("currentPincode", pincode);
localStorage.setItem("currentSubcategoryId", subcategoryId);
  fetch(`product.html?pincode=${pincode}&subcategory_id=${subcategoryId}`)
    .then(res => res.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const productMain = doc.querySelector("main");

      if (productMain) {
        const mainEl = document.querySelector("main");
        mainEl.innerHTML = productMain.innerHTML;

        // ✅ Dynamically load product.css
        const existingLink = document.querySelector('link[href="css/product.css"]');
        if (!existingLink) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "css/product.css";
          document.head.appendChild(link);
        }

        // ✅ Dynamically load product.js
        const script = document.createElement("script");
        script.src = "product.js";
        script.onload = () => {
          if (typeof initProductPage === "function") {
            initProductPage(); // 👈 Call your product page initialization function
            console.log("✅ Product page initialized.");
          }
        };
        document.body.appendChild(script);
      } else {
        console.warn("⚠️ <main> tag not found in product.html.");
      }
    })
    .catch(err => console.error("❌ Error loading product page:", err));
}

document.getElementById("searchForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const query = document.getElementById("searchInput").value.trim();
  const pincode = localStorage.getItem("userPincode");

  if (!query || !pincode) return alert("Please enter a search term and select location.");

  try {
    const res = await fetch(`/searchData?q=${encodeURIComponent(query)}&pincode=${pincode}`);
    const result = await res.json();

    switch (result.type) {
      case "product":
        localStorage.setItem("selectedProductId", result.data.Product_ID);
        loadProductDetailPage(result.data.Product_ID);
        break;

      case "subcategory":
        loadProductPage(pincode, result.data.Subcategory_ID);
        break;

      case "category":
        loadMultipleSubcategoryProducts(pincode, result.data);
        break;

      default:
        alert("No results found.");
    }
  } catch (err) {
    console.error("Search error:", err);
  }
});

// Helper to load product detail
function loadProductDetailPage(productId) {
  fetch(`product-detail.html?product_id=${productId}`)
    .then(res => res.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const detailMain = doc.querySelector("main");

      if (detailMain) {
        document.querySelector("main").innerHTML = detailMain.innerHTML;

        // ✅ Dynamically load product-detail.css if not already loaded
        if (!document.querySelector('link[href="css/product-detail.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "css/product-detail.css";
          document.head.appendChild(link);
        }

        // ✅ Dynamically load product-detail.js
        const script = document.createElement("script");
        script.src = "product-detail.js";
        script.onload = () => {
          if (typeof initProductDetailPage === "function") {
            initProductDetailPage(productId);
            console.log("✅ Product detail page initialized.");
          }
        };
        document.body.appendChild(script);
      } else {
        console.warn("⚠️ <main> not found in product-detail.html");
      }
    })
    .catch(err => {
      console.error("❌ Error loading product detail page:", err);
    });
}

async function loadMultipleSubcategoryProducts(pincode, subcategories) {
  const productMain = document.querySelector("main");
  productMain.innerHTML = "";

  const fetches = subcategories.map(async (subcat) => {
    console.log("Fetching products for subcategory:", subcat.Subcategory_ID, "Pincode:", pincode);

    try {
      const response = await fetch(`/getProductsBySubcategoryAndPincode?subcategory_id=${subcat.Subcategory_ID}&pincode=${pincode}`);
      const products = await response.json();

      if (products.length === 0) {
        return `<section><h2>${subcat.Subcategory_Name}</h2><p>No products found.</p></section>`;
      }

      const productsHtml = products.map(product => `
        <div class="product-card">
          <img src="${product.Image}" alt="${product.Product_Name}" />
          <h3>${product.Product_Name}</h3>
          <p>Price: ₹${product.Price}</p>
          <p>Stock: ${product.Stock_Quantity}</p>
          <p>Expiry: ${new Date(product.Expiry_Date).toLocaleDateString()}</p>
        </div>
      `).join("");

      return `
        <section>
          <h2>${subcat.Subcategory_Name}</h2>
          <div class="products-container">
            ${productsHtml}
          </div>
        </section>
      `;
    } catch (err) {
      console.error("❌ Failed fetching products:", err);
      return `<section><h2>${subcat.Subcategory_Name}</h2><p>Failed to load products.</p></section>`;
    }
  });

  try {
    const allContent = await Promise.all(fetches);
    productMain.innerHTML = allContent.join("");

    if (typeof initProductPage === "function") {
      initProductPage();
    }
  } catch (err) {
    console.error("❌ Error loading multiple subcategory products:", err);
  }
}