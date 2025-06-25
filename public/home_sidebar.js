document.addEventListener("DOMContentLoaded", function () {
    restorePageState();
    fetchCategories();
});

function fetchCategories() {
    const urlParams = new URLSearchParams(window.location.search);
    const locationID = urlParams.get("location_id");
    if (!locationID) {
        alert("Location ID not found in URL. Please select a location first.");
        return;
    }

    // Store it in localStorage for access in other forms
    localStorage.setItem("selectedLocationID", locationID);

    fetch(`/get-categories?location_id=${locationID}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderCategories(data.categories);
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(error => console.error("Error fetching categories:", error));
}
function renderCategories(categories) {
    const container = document.getElementById("category-container");
    container.innerHTML = ""; // Clear previous content

    categories.forEach(category => {
        const categoryWrapper = document.createElement("div");

        // Category header: name + delete button
        const header = document.createElement("div");
        header.className = "category-header";

        const toggleLink = document.createElement("a");
        toggleLink.href = "#";
        toggleLink.textContent = `${category.Category_Name} ▼`;
        toggleLink.onclick = function (event) {
            event.preventDefault();
            toggleSubmenuWithFetch(`cat-${category.Category_ID}`, category.Category_ID);
        };

        const deleteCategoryBtn = document.createElement("button");
        deleteCategoryBtn.textContent = "🗑️";
        deleteCategoryBtn.className = "btn btn-sm btn-outline-danger btn-delete-cat";
        deleteCategoryBtn.onclick = () => {
            if (confirm(`Are you sure you want to delete category "${category.Category_Name}"?`)) {
                const locationId = localStorage.getItem("selectedLocationID"); // Use correct key
        
                fetch(`/delete-category/${category.Category_ID}?location_id=${locationId}`, { method: "DELETE" })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            alert("Category deleted successfully");
                            fetchCategories(); // Refresh categories
                        } else {
                            alert("Failed to delete category: " + data.message);
                        }
                    })
                    .catch(err => {
                        console.error("Error deleting category:", err);
                        alert("An error occurred while deleting the category.");
                    });
            }
        };
        
        

        header.appendChild(toggleLink);
        header.appendChild(deleteCategoryBtn);

        const submenu = document.createElement("div");
        submenu.id = `cat-${category.Category_ID}`;
        submenu.className = "submenu";
        submenu.style.display = "none";

        categoryWrapper.appendChild(header);
        categoryWrapper.appendChild(submenu);
        container.appendChild(categoryWrapper);
    });

    // Bottom button row: Add Category + Delete All button (optional)
    const bottomControls = document.createElement("div");
    bottomControls.className = "mt-3 d-flex gap-2";

    const addCategoryBtn = document.createElement("button");
    addCategoryBtn.textContent = "+ Add Category";
    addCategoryBtn.className = "btn btn-sm btn-success";
    addCategoryBtn.onclick = openAddCategoryForm;

    bottomControls.appendChild(addCategoryBtn);
    container.appendChild(bottomControls);
}


function toggleSubmenuWithFetch(submenuId, categoryId) {
    const submenu = document.getElementById(submenuId);

    submenu.style.display = submenu.style.display === "block" ? "none" : "block";

    // Refresh submenu content every time
    fetch(`/get-subcategories?category_id=${categoryId}`)
        .then(response => response.json())
        .then(data => {
            submenu.innerHTML = ""; // Clear before adding

            if (data.success) {
                data.subcategories.forEach(sub => {
                    const subItem = document.createElement("div");
                    subItem.className = "subcategory-item";
                    subItem.textContent = `➤ ${sub.Subcategory_Name}`;

                    // Add product loading on subcategory click
                    subItem.addEventListener("click", () => {
                        fetchProducts(sub.Subcategory_ID);
                    });

                    submenu.appendChild(subItem);
                });
            } else {
                submenu.innerHTML = "<p style='color: red;'>No subcategories found.</p>";
            }

            // Add subcategory button
            const addSubBtn = document.createElement("button");
            addSubBtn.textContent = "+ Add Subcategory";
            addSubBtn.className = "btn btn-sm btn-outline-primary mt-2";
            addSubBtn.onclick = () => openAddSubcategoryForm(categoryId);
            submenu.appendChild(addSubBtn);
        })
        .catch(error => {
            console.error("Error fetching subcategories:", error);
            submenu.innerHTML = "<p style='color: red;'>Failed to load subcategories.</p>";
        });
}

function openAddCategoryForm() {
    const locationID = localStorage.getItem("selectedLocationID");
    if (!locationID) {
        alert("Location not selected. Please select one first.");
        return;
    }

    const returnUrl = encodeURIComponent(window.location.href);
    const url = `addCategory.html?location_id=${locationID}&return_url=${returnUrl}`;
    window.open(url, "_blank", "width=500,height=500");
}

function openAddSubcategoryForm(categoryID) {
    const locationID = localStorage.getItem("selectedLocationID");
    if (!locationID) {
        alert("Location not selected. Please select one first.");
        return;
    }

    const returnUrl = encodeURIComponent(window.location.href);
    const url = `addSubcategory.html?category_id=${categoryID}&location_id=${locationID}&return_url=${returnUrl}`;
    window.open(url, "_blank", "width=500,height=500");
}



// Function to fetch products with stock and search filters
function fetchProducts(subcategoryId, searchFilter = "", stockFilter = "") {
    currentSubcategoryId = subcategoryId;
    localStorage.setItem("selectedSubcategoryId", subcategoryId);

    const locationID = localStorage.getItem("selectedLocationID");

    let url = `/get-products?subcategory_id=${subcategoryId}`;
    if (stockFilter !== "") url += `&stock_update=${stockFilter}`;
    if (searchFilter !== "") url += `&search=${encodeURIComponent(searchFilter)}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const productList = document.getElementById("product-list");
            productList.innerHTML = "";

            if (data.success && data.products.length > 0) {
                data.products.forEach(product => {
                    let stockStatus = "";
                    if (product.Stock_Quantity === 0) {
                        stockStatus = "Out of Stock";
                    } else if (product.Stock_Quantity < product.Stock_Update) {
                        stockStatus = "Low Stock";
                    } else {
                        stockStatus = "In Stock";
                    }

                    // Fetch the product card template
                    fetch("product_card.html")
                        .then(response => response.text())
                        .then(cardTemplate => {
                            const productCard = document.createElement("div");
                            productCard.innerHTML = cardTemplate;

                            // Fill the product card with the data
                            productCard.querySelector(".product-id").textContent = product.Product_ID;
                            productCard.querySelector(".card-title").textContent = product.Name;
                            productCard.querySelector(".price").textContent = `Price: ₹${product.Price}`;
                            productCard.querySelector(".stock").textContent = `Stock: ${product.Stock_Quantity} (${stockStatus})`;
                            productCard.querySelector(".expiry").textContent = `Expiry: ${product.Expiry_Date ? new Date(product.Expiry_Date).toLocaleDateString() : "N/A"}`;
                            productCard.querySelector(".supplier-id").textContent = `Supplier ID: ${product.Supplier_ID ?? "N/A"}`;
                            productCard.querySelector(".details").textContent = `Details: ${product.Detail || "N/A"}`;

                            // Add Edit button functionality
                            productCard.querySelector(".edit-btn").onclick = () => {
                                // Make fields editable
                                productCard.querySelector(".card-title").innerHTML = `<input type="text" value="${product.Name}" class="edit-input">`;
                                productCard.querySelector(".price").innerHTML = `<input type="number" value="${product.Price}" class="edit-input">`;
                                productCard.querySelector(".stock").innerHTML = `<input type="number" value="${product.Stock_Quantity}" class="edit-input">`;
                                productCard.querySelector(".expiry").innerHTML = `<input type="date" value="${product.Expiry_Date ? new Date(product.Expiry_Date).toLocaleDateString('en-CA') : ''}" class="edit-input">`;
                                productCard.querySelector(".supplier-id").innerHTML = `<input type="text" value="${product.Supplier_ID}" class="edit-input">`;
                                productCard.querySelector(".details").innerHTML = `<textarea class="edit-input">${product.Detail}</textarea>`;

                                // Hide Edit button, show Update button
                                productCard.querySelector(".edit-btn").style.display = "none";
                                const updateButton = document.createElement("button");
                                updateButton.classList.add("update-btn");
                                updateButton.textContent = "Update";
                                productCard.querySelector(".button-group").appendChild(updateButton);

                                // Add event listener for the Update button
                                updateButton.onclick = () => updateProduct(product.Product_ID, productCard, updateButton);
                            };

                            // Delete Button functionality
                            productCard.querySelector(".delete-btn").onclick = () => deleteProduct(product.Product_ID);

                            // Append the product card to the product list
                            productList.appendChild(productCard);
                        });
                });
            } else {
                productList.innerHTML = "<p class='text-muted'>No products available in this subcategory.</p>";
            }
        })
        .catch(error => {
            console.error("Error fetching products:", error);
            document.getElementById("product-list").innerHTML = "<p class='text-danger'>Failed to load products.</p>";
        });
}



// Function to handle the update product logic
function updateProduct(productId, productCard, updateButton) {
    // Retrieve the edited values from the input fields
    const name = productCard.querySelector(".card-title input").value;
    const price = parseFloat(productCard.querySelector(".price input").value);
    const stockQuantity = parseInt(productCard.querySelector(".stock input").value);
    const expiryDate = productCard.querySelector(".expiry input").value;
    const supplierId = productCard.querySelector(".supplier-id input").value;
    const details = productCard.querySelector(".details textarea").value;

    // Prepare the data to send to the backend
    const updatedProduct = {
        Product_ID: productId,
        Name: name,
        Price: price,
        Stock_Quantity: stockQuantity,
        Expiry_Date: expiryDate,
        Supplier_ID: supplierId,
        Detail: details
    };

    // Send the update request to the server
    fetch(`/update-product`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedProduct)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // If the update was successful, update the product card with the new values
            productCard.querySelector(".card-title").textContent = name;
            productCard.querySelector(".price").textContent = `Price: ₹${price}`;
            productCard.querySelector(".stock").textContent = `Stock: ${stockQuantity}`;
            productCard.querySelector(".expiry").textContent = `Expiry: ${new Date(expiryDate).toLocaleDateString()}`;
            productCard.querySelector(".supplier-id").textContent = `Supplier ID: ${supplierId}`;
            productCard.querySelector(".details").textContent = `Details: ${details || "N/A"}`;

            // Hide the Update button and show the Edit button again
            updateButton.style.display = "none";
            const editButton = productCard.querySelector(".edit-btn");
            editButton.style.display = "inline-block";
        } else {
            console.error("Failed to update product:", data.message);
            alert("Failed to update product. Please try again.");
        }
    })
    .catch(error => {
        console.error("Error updating product:", error);
        alert("An error occurred while updating the product.");
    });
}
// Delete product functionality
function deleteProduct(productId) {
    if (confirm("Are you sure you want to delete this product?")) {
        fetch(`/delete-product/${productId}`, {
            method: "DELETE",
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    alert("Product deleted successfully");

                    // Store the page state before refreshing
                    storePageState();

                    // Check if the current window was opened from another page (popup or separate window)
                    const urlParams = new URLSearchParams(window.location.search);
                    const returnUrl = urlParams.get("return_url");

                    if (returnUrl) {
                        // Redirect to the main page
                        window.location.href = returnUrl;
                    } else if (window.opener) {
                        // If this is a popup, refresh the parent window
                        window.opener.location.reload();
                        window.close(); // Close the current (child) window after the parent is refreshed
                    } else {
                        // If no parent window, just refresh the current page
                        location.reload();
                    }
                } else {
                    alert("Failed to delete product: " + data.message);
                }
            })
            .catch((err) => {
                console.error("Error deleting product:", err);
                alert("Error deleting product");
            });
    }
}

// Store page state before the page reloads
function storePageState() {
    // Store selected subcategory, search filter, and any other necessary details in localStorage
    const selectedSubcategoryId = localStorage.getItem("selectedSubcategoryId");
    const searchFilter = document.getElementById("searchInput")?.value || "";
    const stockFilter = document.getElementById("stockFilter")?.value || "";

    localStorage.setItem("selectedSubcategoryId", selectedSubcategoryId);
    localStorage.setItem("searchFilter", searchFilter);
    localStorage.setItem("stockFilter", stockFilter);
}

// Restore page state after the page refresh
function restorePageState() {
    // Retrieve stored values
    const selectedSubcategoryId = localStorage.getItem("selectedSubcategoryId");
    const searchFilter = localStorage.getItem("searchFilter");
    const stockFilter = localStorage.getItem("stockFilter");

    if (selectedSubcategoryId) {
        // Re-apply the selected subcategory if present
        fetchProducts(selectedSubcategoryId, searchFilter, stockFilter);
    }

    // Optionally, restore search and filter values to the input fields
    if (searchFilter) {
        document.getElementById("searchInput").value = searchFilter;
    }
    if (stockFilter) {
        document.getElementById("stockFilter").value = stockFilter;
    }
}

