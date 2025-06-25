document.addEventListener("click", function (event) {
    if (event.target.matches("[onclick*='toggleMenu']")) {
        let menuId = event.target.getAttribute("onclick").match(/'([^']+)'/)[1];
        toggleMenu(menuId);
    }

    if (event.target.matches("[onclick*='fetchLocationIDAndRedirect']")) {
        fetchLocationIDAndRedirect(event);
    }
});

function toggleMenu(id) {
    let menu = document.getElementById(id);
    if (menu) {
        menu.style.display = menu.style.display === "block" ? "none" : "block";
    }
}

function fetchLocationIDAndRedirect(event) {
    event.preventDefault();

    let locationID = localStorage.getItem("selectedLocationID"); // ✅ Fetch directly from localStorage
    if (!locationID) {
        alert("Location ID not found. Please select a location first.");
        return;
    }

    let redirectURL = `/admin_home.html?location_id=${locationID}`;
    console.log("Redirecting to:", redirectURL); // ✅ Debug Log
    window.location.href = redirectURL; // ✅ Redirect to admin_home with location ID
}


function handleDeliveryPartnerClick(event) {


    let locationID = localStorage.getItem("selectedLocationID"); // ✅ Fetch directly from localStorage
    if (!locationID) {
        alert("Location ID not found. Please select a location first.");
        return;
    }

    let redirectURL = `/delivery_partner.html?location_id=${locationID}`;
    console.log("Redirecting to:", redirectURL); // ✅ Debug Log
    window.location.href = redirectURL; // ✅ Redirect to admin_home with location ID
}
