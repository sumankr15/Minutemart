document.addEventListener('DOMContentLoaded', function () {
    const userId = new URLSearchParams(window.location.search).get('userId');
    let addressExists = false;

    if (userId) {
        document.getElementById('userId').value = userId;

        // Check if user has an existing address
        fetch(`/api/checkAddress/${userId}`)
            .then(response => response.json())
            .then(data => {
                if (data.exists) {
                    addressExists = true;
                    fillAddressForm(data.address);
                    document.getElementById('updateBtn').style.display = 'inline-block';
                    document.getElementById('submitBtn').style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error checking address:', error);
            });
    }

    // Handle address submission (new or update)
    document.getElementById('addressForm').addEventListener('submit', function (event) {
        event.preventDefault();

        const addressData = {
            addressLine: document.getElementById('addressLine').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            postalCode: document.getElementById('postalCode').value,
            country: document.getElementById('country').value
        };

        // First, check the stock availability before proceeding
        fetch(`/api/checkCartStock/${userId}`)
            .then(response => response.json())
            .then(stockData => {
                if (!stockData.success) {
                    // Show warning if any item has low stock
                    alert(stockData.message);
                    // Clear affected cart items
                    localStorage.setItem('cart', JSON.stringify(stockData.updatedCart));
                    return; // Don't proceed further if stock is low
                }

                let apiUrl, method;

                if (addressExists) {
                    apiUrl = `/api/updateAddress/${userId}`;
                    method = 'PUT';
                } else {
                    apiUrl = '/api/createAddress';
                    method = 'POST';
                    addressData.userId = userId;
                }

                fetch(apiUrl, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(addressData)
                })
                .then(response => response.json())
                .then(responseData => {
                    alert(responseData.message);
                    if (responseData.success) {
                        localStorage.setItem('userId', userId);
                        sessionStorage.setItem('justUpdatedAddress', 'true');
                        window.location.href = 'orderSuccess.html';
                    }
                })
                .catch(error => {
                    console.error('Error submitting address:', error);
                });
            })
            .catch(error => {
                console.error('Error checking cart stock:', error);
            });
    });

    document.getElementById('updateBtn').addEventListener('click', function () {
        const userId = localStorage.getItem('userId');

        if (userId) {
            // Only log delivery (invoice logic removed)
            fetch('/api/logDelivery', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: userId })
            })
            .then(res => res.json())
            .then(deliveryResponse => {
                console.log('Delivery log created:', deliveryResponse);

                // Clear cart for the user
                localStorage.removeItem('cart');
            })
            .catch(err => {
                console.error('Error logging delivery:', err);
            });
        }

        // Proceed with the address form submission
        document.getElementById('addressForm').dispatchEvent(new Event('submit'));
    });
});

function fillAddressForm(address) {
    document.getElementById('addressLine').value = address.address_line;
    document.getElementById('city').value = address.city;
    document.getElementById('state').value = address.state;
    document.getElementById('postalCode').value = address.postal_code;
    document.getElementById('country').value = address.country;
}
