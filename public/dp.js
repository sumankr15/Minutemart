document.addEventListener('DOMContentLoaded', () => {
    // Extract locationId from the URL query string
    const locationId = new URLSearchParams(window.location.search).get('location_id');

    if (!locationId) {
        alert('Location ID not found.');
        return;
    }

    // Fetch the delivery partners based on locationId
    fetch(`/api/deliveryPartners/${locationId}`)
        .then(res => {
            if (res.status === 404) {
                // No partners found for this location
                renderDeliveryPartners([]);
                return null;
            } else if (!res.ok) {
                // Some other server error
                alert('Failed to load delivery partners');
                return null;
            }
            return res.json();
        })
        .then(data => {
            if (data && data.success) {
                renderDeliveryPartners(data.partners);
            }
        })
        .catch(err => {
            console.error('Error fetching partners:', err);
            alert('An error occurred while loading delivery partners.');
        });
});

// Function to render the delivery partners as cards
function renderDeliveryPartners(partners) {
    const container = document.getElementById('deliveryContainer');
    container.innerHTML = '';  // Clear existing content

    if (!partners || partners.length === 0) {
        container.innerHTML = '<p>No delivery partners available for this location.</p>';
        return;
    }

    partners.forEach(partner => {
        const card = document.createElement('div');
        card.className = 'partner-card';
        card.innerHTML = `
            <img src="${partner.photo}" alt="${partner.name}" class="partner-photo"/>
            <h3>${partner.name}</h3>
            <p>Aadhar No: ${partner.aadhar_no}</p>
            <p>Email: ${partner.email}</p>
            <p>Phone: ${partner.phone_number}</p>
            <button onclick="updatePartner(${partner.id})">Update</button>
            <button onclick="deletePartner(${partner.id})">Delete</button>
        `;
        container.appendChild(card);
    });
}

// Function to handle partner update
function updatePartner(id) {
    window.location.href = `updatePartner.html?partnerId=${id}`;
}

// Function to handle partner deletion
function deletePartner(id) {
    if (confirm('Are you sure you want to delete this partner?')) {
        fetch(`/api/deletePartner/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                location.reload();  // Refresh the page after deletion
            })
            .catch(err => {
                console.error('Error deleting partner:', err);
                alert('Failed to delete partner.');
            });
    }
}
