document.addEventListener('DOMContentLoaded', () => {
    // Dynamically load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/updatePartner.css';
    document.head.appendChild(link);

    const urlParams = new URLSearchParams(window.location.search);
    const partnerId = urlParams.get('partnerId');

    if (!partnerId) {
        alert('Partner ID not found in URL.');
        return;
    }

    // Fetch and prefill partner data
    fetch(`/api/getPartner/${partnerId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const partner = data.partner;
                document.getElementById('partnerId').value = partner.id;
                document.getElementById('name').value = partner.name;
                document.getElementById('aadhar_no').value = partner.aadhar_no;
                document.getElementById('email').value = partner.email;
                document.getElementById('phone_number').value = partner.phone_number;
            } else {
                alert('Failed to load partner details.');
            }
        })
        .catch(err => console.error('Error:', err));
});

// Handle update form submission (without photo)
document.getElementById('partnerForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const updatedData = {
        del_partner_id: document.getElementById('partnerId').value,
        name: document.getElementById('name').value,
        aadhar_no: document.getElementById('aadhar_no').value,
        email: document.getElementById('email').value,
        phone_number: document.getElementById('phone_number').value,
    };

    fetch(`/api/updatePartner/${updatedData.del_partner_id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Partner updated successfully');
            window.history.back();
        } else {
            alert('Update failed: ' + data.message);
        }
    })
    .catch(err => {
        console.error('Error updating:', err);
        alert('Failed to update partner');
    });
});

// Close button returns to previous page
document.getElementById('closeBtn').addEventListener('click', () => {
    history.back();
});
