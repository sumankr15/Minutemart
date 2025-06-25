console.log("📦 location.js loaded!");
document.addEventListener("DOMContentLoaded", function () {
    const trigger = document.getElementById("locationTrigger");
    const popup = document.getElementById("locationPopup");
    const closeBtn = document.getElementById("closePopup");
    const savedAddress = document.getElementById("savedAddress");
    const selectedLocation = document.getElementById("selected-location");
    const enableLocationBtn = document.getElementById("enableLocation");
  
    // Toggle popup
    trigger.addEventListener("click", () => {
      popup.style.display = "block";
    });
  
    closeBtn.addEventListener("click", () => {
      popup.style.display = "none";
    });
  
    // Helper to parse address components
    function parseAddressComponents(components) {
      const get = (type) => {
        const comp = components.find(c => c.types.includes(type));
        return comp ? comp.long_name : "";
      };
  
      return {
        address_line: `${get("street_number")} ${get("route")}`.trim(),
        city: get("locality"),
        state: get("administrative_area_level_1"),
        postal_code: get("postal_code"),
        country: get("country")
      };
    }
  
    // Save address to backend
    function saveAddress(addressObj) {
      fetch("/saveAddress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressObj)
      })
      .then(res => res.json())
      .then(data => {
        console.log("✅ Address saved:", data);
        selectedLocation.textContent = `${addressObj.address_line}, ${addressObj.city}, ${addressObj.state}, ${addressObj.postal_code}, ${addressObj.country}`;
        savedAddress.textContent = selectedLocation.textContent;
      })
      .catch(err => {
        console.error("❌ Failed to save address:", err);
      });
    }
  
    // Google Places Autocomplete
    const input = document.getElementById("addressSearch");
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address && place.address_components) {
        const parsed = parseAddressComponents(place.address_components);
        saveAddress(parsed);
        popup.style.display = "none";
      }
    });
  
    // Fetch current location
    enableLocationBtn.addEventListener("click", () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
  
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === "OK" && results[0]) {
                const parsed = parseAddressComponents(results[0].address_components);
                saveAddress(parsed);
                popup.style.display = "none";
              } else {
                alert("Location fetch failed");
              }
            });
          },
          () => alert("Permission denied.")
        );
      } else {
        alert("Geolocation not supported.");
      }
    });
  
    // Load saved location
    fetch("/getSavedAddress")
      .then(res => res.json())
      .then(data => {
        if (data.address) {
          savedAddress.textContent = data.address;
        } else {
          savedAddress.textContent = "No saved address found.";
        }
      });
  });
  