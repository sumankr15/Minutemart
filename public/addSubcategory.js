document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryID = urlParams.get("category_id");
    const returnURL = urlParams.get("return_url");
    const locationID = localStorage.getItem("selectedLocationID");

    document.getElementById("categoryID").value = categoryID || "";
    document.getElementById("locationID").value = locationID || "";

    if (!categoryID || !locationID) {
        alert("Missing Category ID or Location ID. Please try again.");
        return;
    }

    document.getElementById("subcategoryForm").addEventListener("submit", function (e) {
        e.preventDefault();

        const subcategoryName = document.getElementById("subcategoryName").value;
        const subcategoryImage = document.getElementById("subcategoryImage").files[0];

        if (!subcategoryImage) {
            alert("Please upload an image.");
            return;
        }

        const formData = new FormData();
        formData.append("subcategory_name", subcategoryName);
        formData.append("category_id", categoryID);
        formData.append("location_id", locationID);
        formData.append("subcategory_image", subcategoryImage);

        fetch("/add-subcategory", {
            method: "POST",
            body: formData // No headers needed; browser sets it for multipart
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);

            if (window.opener) {
                window.opener.location.reload();
                window.close();
            } else if (returnURL) {
                window.location.href = decodeURIComponent(returnURL);
            }
        })
        .catch(err => console.error("Error:", err));
    });
});
