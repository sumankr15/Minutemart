document.addEventListener("DOMContentLoaded", () => {
    let currentProductId = null;

    // Function to open modal and fill the form with product data
    window.editProduct = function (productId) {
        console.log("Editing Product ID:", productId);
        currentProductId = productId;

        fetch(`/get-products/${productId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.product) {
                    const product = data.product;

                    document.getElementById("editName").value = product.Name || "";
                    document.getElementById("editPrice").value = product.Price || "";
                    document.getElementById("editStockQty").value = product.Stock_Quantity || "";
                    document.getElementById("editStockUpdate").value = product.Stock_Update || "";
                    document.getElementById("editExpiryDate").value = product.Expiry_Date
                        ? new Date(product.Expiry_Date).toISOString().split("T")[0]
                        : "";
                    document.getElementById("editDetails").value = product.Detail || "";
                    document.getElementById("editSupplierId").value = product.Supplier_ID || "";

                    // Show the modal
                    const modal = new bootstrap.Modal(document.getElementById("editProductModal"));
                    modal.show();
                } else {
                    alert("Product not found.");
                }
            })
            .catch(error => {
                console.error("Error fetching product details:", error);
                alert("Something went wrong while fetching product details.");
            });
    };

    // Submit handler for editing product
    const editForm = document.getElementById("editProductForm");
    if (editForm) {
        editForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const updatedProduct = {
                productId: currentProductId,
                name: document.getElementById("editName").value.trim(),
                price: parseFloat(document.getElementById("editPrice").value),
                stockQty: parseInt(document.getElementById("editStockQty").value),
                stockUpdate: parseInt(document.getElementById("editStockUpdate").value),
                expiryDate: document.getElementById("editExpiryDate").value,
                details: document.getElementById("editDetails").value.trim(),
                supplierId: document.getElementById("editSupplierId").value.trim()
            };

            fetch(`/update-product/${currentProductId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedProduct)
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert("Product updated successfully.");
                        window.location.reload();
                    } else {
                        alert("Failed to update product.");
                    }
                })
                .catch(error => {
                    console.error("Error updating product:", error);
                    alert("An error occurred while updating the product.");
                });
        });
    } else {
        console.error("editProductForm not found.");
    }
});
