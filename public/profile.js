document.getElementById("viewOrdersBtn").addEventListener("click", () => {
  const container = document.getElementById("ordersContainer");
  container.innerHTML = "📦 Fetching orders...";

  fetch("/getOrders", { credentials: "include" })
    .then(res => res.json())
    .then(orders => {
      if (!orders.length) {
        container.innerHTML = "<p>No orders found.</p>";
        return;
      }

      container.innerHTML = "";
      orders.forEach(order => {
        const div = document.createElement("div");
        div.className = "order-card";
        div.style.position = "relative";

        let total = 0;
        const productsHTML = order.products.map(p => {
          const subtotal = p.price * p.quantity;
          total += subtotal;
          return `
            <div class="product-item">
<img src="/uploads/products/${p.image}" alt="${p.name}" />
8              <div>
                <p><strong>${p.name}</strong></p>
                <p>₹${p.price.toFixed(2)} × ${p.quantity} = ₹${subtotal.toFixed(2)}</p>
              </div>
            </div>
          `;
        }).join("");

        const deliveryStatus = order.is_delivered
          ? `<span style="color: green; font-weight: bold;">✅ Delivered</span>`
          : `<span style="color: red; font-weight: bold;">❌ Not Delivered</span>`;

        const printBtn = document.createElement("button");
        printBtn.textContent = "🖨️ Print Invoice";
        printBtn.className = "print-invoice-btn";
        printBtn.style.cssText = "position: absolute; top: 10px; right: 10px;";

        printBtn.addEventListener("click", () => {
          const invoiceWindow = window.open('', '_blank');
          invoiceWindow.document.write(`
            <html>
              <head>
                <title>Invoice - ${order.order_id}</title>
                <style>
                  body { font-family: Arial, sans-serif; padding: 20px; }
                  h2 { text-align: center; }
                  .product-item { display: flex; margin-bottom: 10px; }
                  .product-item img { width: 60px; height: 60px; object-fit: cover; margin-right: 10px; }
                  .print-btn {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #4CAF50;
                    color: white;
                    padding: 8px 12px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                  }
                </style>
              </head>
              <body>
                <button class="print-btn" onclick="window.print()">🖨️ Print / Download PDF</button>
                <h2>Invoice</h2>
                <p><strong>Order ID:</strong> ${order.order_id}</p>
                <p><strong>Date:</strong> ${new Date(order.order_time).toLocaleString()}</p>
                <hr/>
                ${productsHTML}
                <hr/>
                <p><strong>Subtotal:</strong> ₹${total.toFixed(2)}</p>
                <p><strong>Smart Cart Fee:</strong> ₹${(order.smart_cart_fee || 0).toFixed(2)}</p>
                <p><strong>Delivery Fee:</strong> ₹${(order.delivery_fee || 0).toFixed(2)}</p>
                <p><strong>Grand Total:</strong> ₹${(
                  total + (order.smart_cart_fee || 0) + (order.delivery_fee || 0)
                ).toFixed(2)}</p>
                <p><strong>Address:</strong> ${order.address.address_line}, ${order.address.city}, ${order.address.state} - ${order.address.postal_code}, ${order.address.country}</p>
                <hr/>
                <p><strong>Status:</strong> ${order.is_delivered ? "Delivered" : "Not Delivered"}</p>
              </body>
            </html>
          `);
          invoiceWindow.document.close(); // Important to allow proper rendering
        });

        div.innerHTML = `
          <p><strong>Order ID:</strong> ${order.order_id}</p>
          <p><strong>Date:</strong> ${new Date(order.order_time).toLocaleString()}</p>
          <div>${productsHTML}</div>
          <p><strong>Subtotal:</strong> ₹${total.toFixed(2)}</p>
          <p><strong>Smart Cart Fee:</strong> ₹${(order.smart_cart_fee || 0).toFixed(2)}</p>
          <p><strong>Delivery Fee:</strong> ₹${(order.delivery_fee || 0).toFixed(2)}</p>
          <p style="margin-top: 10px;"><strong>Grand Total:</strong> ₹${(
            total + (order.smart_cart_fee || 0) + (order.delivery_fee || 0)
          ).toFixed(2)}</p>
          <p><strong>Address:</strong> ${order.address.address_line}, ${order.address.city}, ${order.address.state} - ${order.address.postal_code}, ${order.address.country}</p>
          <p><strong>Status:</strong> ${deliveryStatus}</p>
        `;
        
        div.appendChild(printBtn);
        container.appendChild(div);
      });
    })
    .catch(err => {
      console.error("❌ Failed to fetch orders:", err);
      container.innerHTML = "<p>Something went wrong while fetching your orders.</p>";
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