document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get("return_url");
    const locationID = urlParams.get("location_id") || localStorage.getItem("selectedLocationID");

    document.getElementById("locationID").value = locationID || "";

    if (!locationID) {
        alert("Location ID not found. Please select a location first.");
        return;
    }

    document.getElementById("categoryForm").addEventListener("submit", function (e) {
        e.preventDefault();

        const categoryName = document.getElementById("categoryName").value;

        fetch("/add-category", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                category_name: categoryName,
                location_id: locationID
            })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);

            if (returnUrl) {
                window.opener.location.href = decodeURIComponent(returnUrl);
                window.close();
            } else {
                window.location.href = `/admin_home.html?location_id=${locationID}`;
            }
        })
        .catch(err => console.error("Error:", err));
    });
});
