require("dotenv").config();
const express = require("express");
const mysql = require("mysql");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const multer = require("multer");
const crypto = require("crypto");
const resetTokens = {};

const fs = require('fs');
const app = express();
const util=require('util');
app.use(cors({
  origin: "http://localhost:5000", // change this to your actual frontend URL
  credentials: true
}));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));
app.use('/uploads', express.static('uploads'));

app.use(session({
    secret: process.env.SESSION_SECRET || "defaultSecret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false,  maxAge: 1000 * 60 * 60 * 24, } 
}));


// Route to serve login_register.html at the root URL
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "welcome.html"));
});

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "WJ28@krhps",
    database: "userdb"
});

db.connect(err => {
    if (err) {
        console.error("❌ Database connection failed:", err);
        process.exit(1);
    }
    console.log("✅ MySQL connected...");
});

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


// Configure multer
const p_storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/partner"); // make sure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // use uploaded file's original name
  }
});


const p_upload = multer({ storage: p_storage });





///image 

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "uploads/subcategories"); // make sure this folder exists
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname); // use uploaded file's original name
    }
  });
  

const upload = multer({ storage: storage });


//product image 
// Storage for product images
const productStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "uploads/products"); // make sure this folder exists
    },
    filename: function (req, file, cb) {
      cb(null,file.originalname);
    }
  });
  
  const uploadProductImage = multer({ storage: productStorage });
// ✅ Send OTP
app.post("/send-otp", (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    req.session.otp = { value: otp, expires: Date.now() + 5 * 60 * 1000 }; // Store OTP with expiration
    req.session.email = email;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP for registration is: ${otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("❌ OTP send error:", error);
            return res.status(500).json({ message: "Failed to send OTP" });
        }
        res.json({ message: "OTP sent to your email" });
    });
});

// app.post("/register", async (req, res) => {
//     const { name, email, password, otp } = req.body;

//     if (!email || !password || !otp) {
//         return res.status(400).json({ message: "All fields are required" });
//     }

//     const storedOtp = req.session.otp;
//     if (!storedOtp || storedOtp.expires < Date.now() || req.session.email !== email || storedOtp.value !== parseInt(otp)) {
//         return res.status(400).json({ message: "Invalid or expired OTP" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);
    
    
//     const isAdmin = email === "iit2023188@iiita.ac.in" ? 1 : 0;

//     db.query("INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)", 
//         [name, email, hashedPassword, isAdmin], 
//         (err, result) => {
//             if (err) {
//                 console.error("❌ Registration error:", err);
//                 return res.status(500).json({ message: "Database error" });
//             }
//             req.session.destroy();
//             res.json({ message: "Registration successful! Please login." });
//         }
//     );
// });

app.post("/register", async (req, res) => {
  const { name, email, password, otp } = req.body;

  if (!email || !password || !otp) {
      return res.status(400).json({ message: "All fields are required" });
  }

  const storedOtp = req.session.otp;
  if (!storedOtp || storedOtp.expires < Date.now() || req.session.email !== email || storedOtp.value !== parseInt(otp)) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if the email belongs to a delivery partner
  db.query("SELECT * FROM del_partner WHERE email = ?", [email], (err, partnerResults) => {
      if (err) {
          console.error("❌ DB Error (partner check):", err);
          return res.status(500).json({ message: "Server error" });
      }

      if (partnerResults.length > 0) {
          // Delivery partner registration (only add password)
          db.query("UPDATE del_partner SET password = ? WHERE email = ?", [hashedPassword, email], (err, result) => {
              if (err) {
                  console.error("❌ Partner registration failed:", err);
                  return res.status(500).json({ message: "Failed to register delivery partner" });
              }
              req.session.destroy();
              return res.json({ 
                  success: true, 
                  message: "Delivery Partner registration successful!",
                  redirect: "/delivery",
                  partnerId: partnerResults[0].id
              });
          });
      } else {
          // Normal user or admin registration
          const isAdmin = email === "suman.kumari.rose.158@gmail.com" ? 1 : 0;
          db.query("INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)", 
              [name, email, hashedPassword, isAdmin], 
              (err, result) => {
                  if (err) {
                      console.error("❌ Registration error:", err);
                      return res.status(500).json({ message: "Database error" });
                  }
                  req.session.destroy();
                  res.json({ 
                      message: "Registration successful! Please login.",
                      redirect: isAdmin ? "/admin-dashboard" : "/user-dashboard"
                  });
              }
          );
      }
  });
});


// ✅ Login User
// app.post("/login", (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//       return res.status(400).json({ message: "Email and password are required" });
//   }

//   db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
//       if (err) {
//           console.error("❌ Database error:", err);
//           return res.status(500).json({ message: "Server error" });
//       }
//       if (results.length === 0) return res.status(401).json({ message: "User not found" });

//       const user = results[0];
//       const isMatch = await bcrypt.compare(password, user.password);

//       if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

      
//       req.session.user = { email: user.email, isAdmin: user.is_admin === 1 };
//       req.session.userId = user.id;

      
//       res.json({ 
//           message: "Login successful!", 
//           isAdmin: user.is_admin === 1,
//           userId: user.id,  
//           redirect: user.is_admin === 1 ? "/admin-dashboard" : "/user-dashboard"
//       });
//   });
// });

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
  }

  // Step 1: Try users table (admin/user)
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) {
          console.error("❌ DB error:", err);
          return res.status(500).json({ message: "Server error" });
      }

      if (results.length > 0) {
          const user = results[0];
          const isMatch = await bcrypt.compare(password, user.password);

          if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

          req.session.user = { email: user.email, isAdmin: user.is_admin === 1 };
          req.session.userId = user.id;

          return res.json({ 
              message: "Login successful!", 
              isAdmin: user.is_admin === 1,
              userId: user.id,
              redirect: user.is_admin === 1 ? "/admin-dashboard" : "/user-dashboard"
          });
      }

      // Step 2: Try delivery partner table
      db.query("SELECT * FROM del_partner WHERE email = ?", [email], async (err, partnerResults) => {
          if (err) {
              console.error("❌ DB error (partner):", err);
              return res.status(500).json({ message: "Server error" });
          }

          if (partnerResults.length === 0) {
              return res.status(401).json({ message: "User not found" });
          }

          const partner = partnerResults[0];

          if (!partner.password) {
              return res.status(403).json({ message: "Partner not registered. Please register first." });
          }

          const isMatch = await bcrypt.compare(password, partner.password);
          if (!isMatch) {
              return res.status(401).json({ message: "Incorrect password" });
          }

          req.session.partner = { email: partner.email };
          req.session.partnerId = partner.id;

          return res.json({
              message: "Delivery partner login successful!",
              redirect: "/delivery",
              partnerId: partner.id
          });
      });
  });
});





app.get("/check-login", (req, res) => {
  if (req.session.partner) {
    return res.json({ loggedIn: true, role: "delivery" });
  } else if (req.session.user) {
    return res.json({ loggedIn: true, role: req.session.user.isAdmin ? "admin" : "user" });
  } else {
    return res.json({ loggedIn: false });
  }
});




app.post("/logout-on-tab-close", (req, res) => {
    if (req.session) {
      req.session.destroy(err => {
        if (err) {
          console.error("❌ Failed to destroy session on tab close");
        }
      });
    }
    res.end(); // No content needed for beacon
  });
  
  app.post('/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.log('Logout error:', err);
        return res.status(500).send('Logout failed');
      }
      res.clearCookie('connect.sid'); // optional: clears session cookie
      res.sendStatus(200); // success
    });
  });





// ✅ Serve Reset Password Page
app.get("/reset-password", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "reset_password.html"));
});


app.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  // Query both users and delivery_partners tables
  const queryUser = new Promise((resolve, reject) => {
    db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
      if (err) return reject(err);
      if (results.length > 0) return resolve({ type: "user", data: results[0] });
      resolve(null);
    });
  });

  const queryPartner = new Promise((resolve, reject) => {
    db.query("SELECT * FROM del_partner WHERE email = ?", [email], (err, results) => {
      if (err) return reject(err);
      if (results.length > 0) return resolve({ type: "partner", data: results[0] });
      resolve(null);
    });
  });

  Promise.all([queryUser, queryPartner])
    .then(([userResult, partnerResult]) => {
      const user = userResult || partnerResult;

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const token = crypto.randomBytes(32).toString("hex");
      resetTokens[token] = {
        email,
        expires: Date.now() + 10 * 60 * 1000, // 10 min expiry
        type: user.type // Save user type for later if needed
      };

      const resetLink = `http://localhost:5000/reset-password?token=${token}`;
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset Link",
        text: `Click the link to reset your password: ${resetLink}`
      };

      transporter.sendMail(mailOptions, (error) => {
        if (error) return res.status(500).json({ message: "Failed to send email" });
        res.json({ message: "Password reset link sent to your email" });
      });
    })
    .catch((err) => {
      console.error("Forgot password error:", err);
      res.status(500).json({ message: "Internal server error" });
    });
});

app.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;

  const tokenData = resetTokens[token];
  if (!tokenData) {
      return res.status(400).json({ message: "Invalid token" });
  }

  if (tokenData.expires < Date.now()) {
      delete resetTokens[token]; // Cleanup expired token
      return res.status(400).json({ message: "Token expired" });
  }

  const { email, type } = tokenData;

  try {
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log("Hashed Password:", hashedPassword);

      // Choose correct table based on type
      const table = type === "partner" ? "del_partner" : "users";

      db.query(`SELECT email FROM ${table} WHERE email = ?`, [email], (err, results) => {
          if (err) return res.status(500).json({ message: "Database error" });

          if (results.length === 0) {
              return res.status(404).json({ message: "User not found" });
          }

          db.query(`UPDATE ${table} SET password = ? WHERE email = ?`, [hashedPassword, email], (err, result) => {
              if (err) {
                  console.error("Database error:", err);
                  return res.status(500).json({ message: "Database error", error: err.message });
              }

              delete resetTokens[token]; // Remove token after successful update
              res.json({ message: "Password reset successful! You can now log in." });
          });
      });

  } catch (err) {
      console.error("Error hashing password:", err);
      return res.status(500).json({ message: "Error hashing password" });
  }
});


//protect admin route
app.get("/admin-dashboard", (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
    }
    res.sendFile(path.join(__dirname, "public", "admin_dashboard.html"));
});
//logout 
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});



// Fetch locations from the database (only location names)
app.get("/get-locations", (req, res) => {
    db.query("SELECT Location_Name FROM Locations", (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results.map(row => row.Location_Name)); // Return only names
    });
});

// Add new location (store name & address in MySQL)
app.post("/add-location", (req, res) => {
    const { location_name, address,pincode } = req.body;
    if (!location_name || !address || !pincode) {
        return res.status(400).json({ error: "Both location name , address and pincode are required" });
    }

    db.query("INSERT INTO Locations (Location_Name, Address , Pincode) VALUES (?, ?,?)", 
    [location_name, address,pincode], 
    (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database insert error" });
        }
        res.json({ message: "Location added successfully!" });
    });
});



app.get("/get-location-id", (req, res) => {
    const locationName = req.query.name;
    const sql = "SELECT Location_ID FROM Locations WHERE Location_Name = ?";

    db.query(sql, [locationName], (err, results) => {
        if (err) return res.json({ success: false, message: "Database error" });
        if (results.length === 0) return res.json({ success: false, message: "Location not found" });

        res.json({ success: true, location_id: results[0].Location_ID });
    });
});


app.post("/checkPincode", async (req, res) => {
    const { pincode } = req.body;
  
    try {
      const [rows] = await db.execute(
        "SELECT * FROM Locations WHERE Pincode = ?",
        [pincode]
      );
  
      if (rows.length > 0) {
        res.json({ available: true });
      } else {
        res.json({ available: false });
      }
    } catch (err) {
      console.error("Error checking pincode:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  

//sidebar edit 
// app.get("/edit_product", (req, res) => {
//     res.sendFile(path.join(__dirname, "public", "admin_home.html"));
// });

app.get("/admin_home", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin_home.html"));
});
app.get('/get-categories', (req, res) => {
    const locationID = req.query.location_id;
    if (!locationID) {
        return res.status(400).json({ success: false, message: "Missing location_id" });
    }

    const sql = `
    SELECT DISTINCT c.Category_ID, c.Category_Name
    FROM Category c
    JOIN StockManagement s ON c.Category_ID = s.Category_ID
    WHERE s.Location_ID = ?
`;
    db.query(sql, [locationID], (err, results) => {
        if (err) {
            console.error("DB Error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        res.json({ success: true, categories: results });
    });
});


// Route to get subcategories for a given category ID
app.get('/get-subcategories', (req, res) => {
    const categoryId = req.query.category_id;

    if (!categoryId) {
        return res.status(400).json({ success: false, message: "Missing category_id" });
    }

    const query = `SELECT Subcategory_ID, Subcategory_Name FROM Subcategory WHERE Category_ID = ?`;

    db.query(query, [categoryId], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        res.json({ success: true, subcategories: results });
    });
});
app.post("/add-category", (req, res) => {
    const { category_name, location_id } = req.body;

    const checkSql = `
        SELECT c.Category_ID 
        FROM Category c
        JOIN StockManagement s ON c.Category_ID = s.Category_ID
        WHERE c.Category_Name = ? AND s.Location_ID = ?
    `;

    db.query(checkSql, [category_name, location_id], (checkErr, checkResult) => {
        if (checkErr) {
            console.error("Error checking for duplicate category:", checkErr);
            return res.status(500).json({ success: false, message: "Error checking for duplicate category" });
        }

        if (checkResult.length > 0) {
            return res.status(409).json({ success: false, message: "Category already exists for this location" });
        }

        // Insert new category
        const insertCategorySql = "INSERT INTO Category (Category_Name) VALUES (?)";

        db.query(insertCategorySql, [category_name], (err, result) => {
            if (err) {
                console.error("Error inserting category:", err);
                return res.status(500).json({ success: false, message: "Error adding category" });
            }

            const categoryId = result.insertId;

            const insertStockSql = "INSERT INTO StockManagement (Category_ID, Location_ID) VALUES (?, ?)";

            db.query(insertStockSql, [categoryId, location_id], (err2) => {
                if (err2) {
                    console.error("Error inserting into StockManagement:", err2);
                    return res.status(500).json({ success: false, message: "Error linking category with location" });
                }

                res.json({ success: true, message: "Category added successfully" });
            });
        });
    });
});

app.post("/add-subcategory", upload.single("subcategory_image"), (req, res) => {
    const { subcategory_name, category_id, location_id } = req.body;
    const imageFile = req.file ? req.file.filename : null;

    if (!imageFile) {
        return res.status(400).json({ success: false, message: "Image upload failed or missing" });
    }

    // ✅ Insert into Subcategory with Location_ID
    const insertSubcategorySql = `
        INSERT INTO Subcategory (Subcategory_Name, Category_ID, Subcategory_Image, Location_ID)
        VALUES (?, ?, ?, ?)
    `;

    db.query(insertSubcategorySql, [subcategory_name, category_id, imageFile, location_id], (err, result) => {
        if (err) {
            console.error("❌ Error inserting subcategory:", err);
            return res.status(500).json({ success: false, message: "Error adding subcategory" });
        }

        const subcategoryId = result.insertId;

        // Insert into StockManagement (optional if still required separately)
        const insertStockSql = "INSERT INTO StockManagement (Category_ID, Location_ID) VALUES (?, ?)";
        db.query(insertStockSql, [category_id, location_id], (err2) => {
            if (err2) {
                console.error("❌ Error inserting into StockManagement:", err2);
                return res.status(500).json({ success: false, message: "Error updating stock for subcategory" });
            }

            res.json({ success: true, message: "Subcategory added successfully" });
        });
    });
});


app.post("/add-product", uploadProductImage.single("productImage"), async (req, res) => {
    const {
      subcategoryId,
      supplierId,
      locationId,
      name,
      price,
      stockQty,
      stockUpdate,
      expiryDate,
      details
    } = req.body;
  
    const image = req.file ? req.file.filename : null;
  
    if (!subcategoryId || !supplierId || !locationId || !name || price == null || stockQty == null || stockUpdate == null) {
      return res.json({ success: false, message: "Missing required fields." });
    }
  
    try {
      const result = await db.query(
        `INSERT INTO Product 
         (Name, Price, Stock_Quantity, Stock_Update, Expiry_Date, Subcategory_ID, Supplier_ID, Location_ID, Detail, Product_Image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, price, stockQty, stockUpdate, expiryDate || null, subcategoryId, supplierId, locationId, details || null, image]
      );
  
      res.json({ success: true, message: "Product added successfully!" });
    } catch (error) {
      console.error("Database error:", error);
      res.json({ success: false, message: "Database error while adding product." });
    }
  });
  
  
 
//get-products
app.get("/get-products", (req, res) => {
    const { subcategory_id, search, min_price, max_price, stock_update } = req.query;

    if (!subcategory_id) {
        return res.status(400).json({ success: false, message: "Subcategory ID is required" });
    }

    let sql = `
        SELECT 
            Product_ID, Name, Price, Stock_Quantity, Expiry_Date,
            Supplier_ID, Stock_Update, Detail
        FROM Product 
        WHERE Subcategory_ID = ?
    `;
    const params = [subcategory_id];

    if (search) {
        sql += " AND Name LIKE ?";
        params.push(`%${search}%`);
    }

    if (min_price) {
        sql += " AND Price >= ?";
        params.push(min_price);
    }

    if (max_price) {
        sql += " AND Price <= ?";
        params.push(max_price);
    }

    if (stock_update !== undefined && stock_update !== "") {
        sql += " AND Stock_Update = ?";
        params.push(stock_update);
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Error fetching products:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        res.json({ success: true, products: results });
    });
});
//user side

app.get("/get-products/:productId", async (req, res) => {
    const { productId } = req.params;

    try {
        const result = await db.query(
            `SELECT Product_ID, Name, Price, Stock_Quantity, Stock_Update, Expiry_Date, Supplier_ID, Detail
             FROM Product 
             WHERE Product_ID = ?`,
            [productId]
        );

        if (result.length > 0) {
            const product = result[0]; // Product details
            res.json({ success: true, product });
        } else {
            res.json({ success: false, message: "Product not found" });
        }
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ success: false, message: "Database error while fetching product" });
    }
});

app.post("/saveAddress", (req, res) => {
    const email = req.session.email;
    const { address_line, city, state, postal_code, country } = req.body;

    if (!email) return res.status(401).json({ message: "Not logged in" });

    const getUserQuery = "SELECT id FROM users WHERE email = ?";
    db.query(getUserQuery, [email], (err, userResults) => {
        if (err || userResults.length === 0)
            return res.status(400).json({ message: "User not found" });

        const userId = userResults[0].id;

        const insertAddressQuery = `
            INSERT INTO addresses (address_line, city, state, postal_code, country) 
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(insertAddressQuery, [address_line, city, state, postal_code, country], (err, addrResult) => {
            if (err) return res.status(500).json({ message: "Insert address failed" });

            const addressId = addrResult.insertId;

            const upsertQuery = `
                INSERT INTO user_addresses (user_id, address_id) 
                VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE address_id = VALUES(address_id)
            `;

            db.query(upsertQuery, [userId, addressId], (err) => {
                if (err) return res.status(500).json({ message: "Linking address failed" });

                res.json({ message: "Address saved successfully" });
            });
        });
    });
});

//delete product
app.delete("/delete-product/:id", (req, res) => {
    const productId = req.params.id;
  
    const sql = "DELETE FROM Product WHERE Product_ID = ?";
    db.query(sql, [productId], (err, result) => {
      if (err) {
        console.error("Error deleting product:", err);
        return res.json({ success: false, message: "Database error" });
      }
  
      if (result.affectedRows > 0) {
        res.json({ success: true });
      } else {
        res.json({ success: false, message: "Product not found" });
      }
    });
  });
  
 
// Route to update a product
app.post('/update-product', (req, res) => {
    const {
        Product_ID,
        Name,
        Price,
        Stock_Quantity,
        Expiry_Date,
        Supplier_ID,
        Detail
    } = req.body;

    // Ensure all required fields are provided
    if (!Product_ID || !Name || !Price || !Stock_Quantity || !Expiry_Date || !Supplier_ID) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields'
        });
    }

    // Prepare the update SQL query
    const query = `
        UPDATE Product 
        SET 
            Name = ?, 
            Price = ?, 
            Stock_Quantity = ?, 
            Expiry_Date = ?, 
            Supplier_ID = ?, 
            Detail = ?
        WHERE Product_ID = ?
    `;

    const values = [Name, Price, Stock_Quantity, Expiry_Date, Supplier_ID, Detail, Product_ID];

    // Execute the query
    db.query(query, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Failed to update product',
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Send success response
        res.json({
            success: true,
            message: 'Product updated successfully'
        });
    });
});



//checking pincode 
// Route to check pincode availability
app.get('/checkPincode', (req, res) => {
    const { pincode } = req.query;
  
    if (!pincode) {
      return res.status(400).json({ error: 'Pincode is required' });
    }
  
    const query = 'SELECT is_available FROM locations WHERE pincode = ?';
    db.query(query, [pincode], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
  
      if (results.length > 0 && results[0].is_available === 1) {
        res.json({ available: true });
      } else {
        res.json({ available: false });
      }
    });
  });

  app.get('/getCategoriesByPincode', (req, res) => {
    const { pincode } = req.query;

    if (!pincode) return res.status(400).json({ message: "Pincode required" });

    db.query("SELECT Location_ID FROM Locations WHERE Pincode = ?", [pincode], (err, location) => {
        if (err) return res.status(500).json({ message: "Server error" });

        if (location.length === 0) return res.status(404).json({ message: "Location not found" });

        const locationId = location[0].Location_ID;

        // 👇 Removed Category_Image from SELECT
        db.query(`
            SELECT c.Category_ID, c.Category_Name
            FROM StockManagement s
            JOIN Category c ON s.Category_ID = c.Category_ID
            WHERE s.Location_ID = ?
        `, [locationId], (err, categories) => {
            if (err) return res.status(500).json({ message: "Server error" });

            res.json(categories);
        });
    });
});

app.get("/getSubcategoriesByCategoryAndPincode", (req, res) => {
    const { pincode, category_id } = req.query;

    if (!pincode || !category_id) {
        return res.status(400).json({ message: "Missing pincode or category ID" });
    }

    const locationSql = "SELECT Location_ID FROM Locations WHERE Pincode = ?";
    db.query(locationSql, [pincode], (err, locationResult) => {
        if (err) return res.status(500).json({ message: "Server error" });
        if (locationResult.length === 0) return res.status(404).json({ message: "Location not found" });

        const locationId = locationResult[0].Location_ID;

        const subSql = `
            SELECT Subcategory_ID, Subcategory_Name, Subcategory_Image
            FROM Subcategory
            WHERE Category_ID = ? AND Location_ID = ?
        `;

        db.query(subSql, [category_id, locationId], (err2, subs) => {
            if (err2) return res.status(500).json({ message: "Error fetching subcategories" });
            res.json(subs);
        });
    });
});


app.get('/get-subcategory-name', (req, res) => {
    console.log("title -subcategory name");
    const subcategoryId = req.query.subcategory_id;
  
    if (!subcategoryId) {
      return res.status(400).json({ error: "subcategory_id is required" });
    }
  
    const query = `
      SELECT Subcategory_Name
      FROM Subcategory
      WHERE Subcategory_ID = ?
      LIMIT 1
    `;
  
    db.query(query, [subcategoryId], (err, results) => {
      if (err) {
        console.error("❌ Error fetching subcategory name:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
  
      if (results.length === 0) {
        return res.status(404).json({ error: "Subcategory not found" });
      }
  
      return res.json({ subcategory_name: results[0].Subcategory_Name });
    });
  });

  
  app.get('/getProductsBySubcategoryAndPincode', (req, res) => {
    const { subcategory_id, pincode } = req.query;
  
    if (!subcategory_id || !pincode) {
      return res.status(400).json({ error: "subcategory_id and pincode are required" });
    }
  
    const getLocationIdQuery = `
      SELECT Location_ID FROM Locations WHERE Pincode = ?
    `;
  
    db.query(getLocationIdQuery, [pincode], (err, locResults) => {
      if (err) {
        console.error("❌ Error finding location:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
  
      if (locResults.length === 0) {
        return res.status(404).json({ error: "Location not found for given pincode" });
      }
  
      const locationId = locResults[0].Location_ID;
  
      const getProductsQuery = `
        SELECT 
          p.Product_ID,
          p.Name AS Product_Name,
          p.Price,
          p.Stock_Quantity,
          p.Expiry_Date,
          s.Name,
          s.Address AS Supplier_Address,
          p.Product_Image
        FROM Product p
        JOIN Supplier s ON p.Supplier_ID = s.Supplier_ID
        JOIN Subcategory sc ON p.Subcategory_ID = sc.Subcategory_ID
        WHERE p.Subcategory_ID = ?
          AND sc.Location_ID = ?
      `;
  
      db.query(getProductsQuery, [subcategory_id, locationId], (err, productResults) => {
        if (err) {
          console.error("❌ Error fetching products:", err);
          return res.status(500).json({ error: "Internal server error" });
        }
  
        res.json(productResults);
      });
    });
  });
  

  app.get("/getLocationByPincode", (req, res) => {
    const { pincode } = req.query;
    const query = "SELECT Location_ID FROM Locations WHERE Pincode = ?";
  
    db.query(query, [pincode], (err, result) => {
      if (err) {
        console.error("❌ Error fetching location:", err);
        return res.status(500).json({ error: "Database error" });
      }
  
      if (result.length === 0) {
        return res.status(404).json({ message: "Location not found" });
      }
  
      res.json({ location_id: result[0].Location_ID });
    });
  });
  app.get("/getProductsBySubcategoryAndLocation", (req, res) => {
    console.log("in product fetching to render.");
    const { subcategory_id, location_id } = req.query;
  console.log(subcategory_id,location_id);
    const query = `
      SELECT 
        p.Product_ID,
        p.Name,
        p.Price,
        p.Product_Image
      FROM Product p
      WHERE p.Subcategory_ID = ? AND p.Location_ID = ?
    `;
  
    db.query(query, [subcategory_id, location_id], (err, result) => {
      if (err) {
        console.error("❌ Error fetching products:", err);
        return res.status(500).json({ error: "Database error" });
      }
  
      res.json(result);
    });
  });
  //
  app.get("/getProductDetail", (req, res) => {
    const { product_id } = req.query;
    if (!product_id) return res.status(400).json({ message: "Missing product ID" });
    console.log(product_id);
    const sql = `
        SELECT 
    p.Product_ID, p.Name AS ProductName, p.Price, p.Stock_Quantity, p.Stock_Update, 
    p.Expiry_Date, p.Product_Image, p.Detail,
    s.Name AS SupplierName, s.Address AS SupplierAddress
FROM Product p
JOIN Supplier s ON p.Supplier_ID = s.Supplier_ID
WHERE p.Product_ID = ?

    `;

    db.query(sql, [product_id], (err, result) => {
        if (err) return res.status(500).json({ message: "Server error" });
        if (result.length === 0) return res.status(404).json({ message: "Product not found" });

        res.json(result[0]);
    });
});


app.post("/add-to-cart", (req, res) => {
  const { productId } = req.body;
  const userId = req.session.userId;  // make sure user is logged in
  

  if (!userId || !productId) {
    return res.status(400).json({ success: false, redirect: "/login_register.html",message: "LogIn Is Required" });
  }

  db.query(
    "SELECT * FROM Cart WHERE User_ID = ? AND Product_ID = ?",
    [userId, productId],
    (err, existing) => {
      if (err) {
        console.error("❌ Error checking existing cart item:", err);
        return res.status(500).json({ success: false, message: "Database error" });
      }

      if (existing.length > 0) {
        // Product already in cart, increase quantity
        db.query(
          "UPDATE Cart SET Quantity = Quantity + 1 WHERE User_ID = ? AND Product_ID = ?",
          [userId, productId],
          (err) => {
            if (err) {
              console.error("❌ Error updating cart item:", err);
              return res.status(500).json({ success: false, message: "Database error" });
            }
            sendCartCount();
          }
        );
      } else {
        // Product not in cart, insert new
        db.query(
          "INSERT INTO Cart (User_ID, Product_ID, Quantity) VALUES (?, ?, 1)",
          [userId, productId],
          (err) => {
            if (err) {
              console.error("❌ Error inserting cart item:", err);
              return res.status(500).json({ success: false, message: "Database error" });
            }
            sendCartCount();
          }
        );
      }

      function sendCartCount() {
        db.query("SELECT COUNT(*) AS count FROM Cart WHERE User_ID = ?", [userId], (err, result) => {
          if (err) {
            console.error("❌ Error getting cart count:", err);
            return res.status(500).json({ success: false, message: "Database error" });
          }
          res.json({ success: true, cartCount: result[0].count });
        });
      }
    }
  );
});

app.get("/cart-count", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.json({ count: 0 });

  db.query("SELECT SUM(Quantity) AS count FROM Cart WHERE User_ID = ?", [userId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ count: 0 });
    }
    res.json({ count: rows[0].count });
  });
});

app.get("/cart-items", (req, res) => {
  console.log("Session object:", req.session);

  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ success: false, message: "Not logged in" });

  const sql = `
    SELECT c.Product_ID, c.Quantity, p.Name, p.Price, p.Product_Image
    FROM Cart c
    JOIN Product p ON c.Product_ID = p.Product_ID
    WHERE c.User_ID = ?
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error("❌ Error fetching cart items:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    //console.log("🛒 Cart items from DB:", results); 
    res.json(rows);
  });
});

app.post("/update-cart-quantity", (req, res) => {
  const { productId, change } = req.body;
  const userId = req.session.userId;

  if (!userId || !productId || typeof change !== "number") {
    return res.status(400).json({ success: false, message: "Invalid request" });
  }

  const getQuantitySql = "SELECT Quantity FROM Cart WHERE User_ID = ? AND Product_ID = ?";
  db.query(getQuantitySql, [userId, productId], (err, results) => {
    if (err) {
      console.error("❌ Error fetching quantity:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    const currentQty = results[0].Quantity;
    const newQty = currentQty + change;

    if (newQty <= 0) {
      // Remove item from cart
      const deleteSql = "DELETE FROM Cart WHERE User_ID = ? AND Product_ID = ?";
      db.query(deleteSql, [userId, productId], (err) => {
        if (err) {
          console.error("❌ Error deleting item:", err);
          return res.status(500).json({ success: false, message: "Failed to remove item" });
        }
        return res.json({ success: true, newQuantity: 0 });
      });
    } else {
      // Update quantity
      const updateSql = "UPDATE Cart SET Quantity = ? WHERE User_ID = ? AND Product_ID = ?";
      db.query(updateSql, [newQty, userId, productId], (err) => {
        if (err) {
          console.error("❌ Error updating quantity:", err);
          return res.status(500).json({ success: false, message: "Failed to update quantity" });
        }
        return res.json({ success: true, newQuantity: newQty });
      });
    }
  });
});

// Check if the user already has an address
app.get('/api/checkAddress/:userId', (req, res) => {
  const userId = req.params.userId;
  
  db.query('SELECT * FROM addresses WHERE User_ID = ?', [userId], (err, results) => {
      if (err) {
          return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      if (results.length > 0) {
          return res.json({ exists: true, address: results[0] });
      } else {
          return res.json({ exists: false });
      }
  });
});

app.post('/api/createAddress', (req, res) => {
  const { userId, addressLine, city, state, postalCode, country } = req.body;

  // Step 1: Check if the pincode exists in the Locations table
  const checkPincodeQuery = `SELECT * FROM Locations WHERE Pincode = ?`;

  db.query(checkPincodeQuery, [postalCode], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error while checking pincode' });
    }

    if (results.length === 0) {
      return res.status(400).json({ success: false, message: 'Pincode is not serviceable. Please select a valid location.' });
    }

    // Step 2: If pincode is valid, insert the address
    const insertQuery = `
      INSERT INTO addresses (address_line, city, state, postal_code, country, User_ID)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(insertQuery, [addressLine, city, state, postalCode, country, userId], (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to insert address' });
      }

      res.json({ success: true, message: 'Address added successfully' });
    });
  });
});


app.put('/api/updateAddress/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const { addressLine, city, state, postalCode, country } = req.body;

  if (!addressLine || !city || !state || !postalCode || !country) {
    return res.status(400).json({ success: false, message: 'All address fields are required.' });
  }

  // Step 1: Check if the pincode exists in Locations
  const checkPincodeQuery = `SELECT * FROM Locations WHERE Pincode = ?`;

  db.query(checkPincodeQuery, [postalCode], (err, results) => {
    if (err) {
      console.error("Pincode check error:", err);
      return res.status(500).json({ success: false, message: 'Database error while checking pincode.' });
    }

    if (results.length === 0) {
      return res.status(400).json({ success: false, message: 'Pincode is not serviceable. Please select a valid location.' });
    }

    // Step 2: Update the address if pincode is valid
    const updateQuery = `
      UPDATE addresses 
      SET address_line = ?, city = ?, state = ?, postal_code = ?, country = ? 
      WHERE user_id = ?
    `;

    db.query(updateQuery, [addressLine, city, state, postalCode, country, userId], (err, result) => {
      if (err) {
        console.error("Error updating address:", err);
        return res.status(500).json({ success: false, message: 'Failed to update address. Please try again later.' });
      }

      return res.json({ success: true, message: 'Address updated successfully!' });
    });
  });
});




//delete category
app.delete('/delete-category/:id', (req, res) => {
  const categoryId = req.params.id;
  const locationId = req.query.location_id;

  if (!locationId) {
      return res.status(400).json({ success: false, message: 'Location ID is required' });
  }

  const deleteStockQuery = `
      DELETE FROM StockManagement
      WHERE Category_ID = ? AND Location_ID = ?
  `;

  db.query(deleteStockQuery, [categoryId, locationId], (err, result) => {
      if (err) {
          console.error('Error deleting stock entries:', err);
          return res.status(500).json({ success: false, message: 'Internal server error' });
      }

      if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: 'No matching stock entries found' });
      }

      res.status(200).json({ success: true, message: 'Stock entries deleted successfully' });
  });
});



// Endpoint to get user details and address
app.get('/api/getUserDetails', (req, res) => {
  const userId = req.query.userId; // Get userId from query parameters

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  // SQL query to fetch user details and address
  const queryy = `
    SELECT users.name, 
           addresses.address_line, 
           addresses.city, 
           addresses.state, 
           addresses.postal_code, 
           addresses.country
    FROM users
    JOIN user_addresses ON users.id = user_addresses.user_id
    JOIN addresses ON user_addresses.address_id = addresses.id
    WHERE users.id = ?
  `;

db.query(queryy, [userId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Failed to fetch user details', details: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'User or address not found' });
    }

    // Respond with the user and address details
    const user = results[0];
    res.json({
      user: { name: user.name },
      address: {
        address_line: user.address_line,
        city: user.city,
        state: user.state,
        postal_code: user.postal_code,
        country: user.country
      }
    });
  });
});


app.post('/api/logDelivery', (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID is required.' });
  }

  const getAddressQuery = 'SELECT id, postal_code FROM addresses WHERE User_ID = ? LIMIT 1';

  db.query(getAddressQuery, [userId], (err, addressResults) => {
    if (err || addressResults.length === 0) {
      return res.status(400).json({ success: false, message: 'No address found for the user.' });
    }

    const addressId = addressResults[0].id;
    const postalCode = addressResults[0].postal_code;

    const getPartnerQuery = `
      SELECT dp.id
      FROM del_partner dp
      JOIN locations l ON dp.location_id = l.Location_ID
      LEFT JOIN delivery d ON dp.id = d.del_partner_id
      WHERE l.Pincode = ?
      GROUP BY dp.id
      ORDER BY COUNT(d.delivery_id) ASC
      LIMIT 1
    `;

    db.query(getPartnerQuery, [postalCode], (err, partnerResults) => {
      if (err || partnerResults.length === 0) {
        return res.status(404).json({ success: false, message: 'No delivery partner found for this postal code.' });
      }

      const delPartnerId = partnerResults[0].id;

      const getCartItemsQuery = 'SELECT Product_ID, Quantity FROM Cart WHERE User_ID = ?';
      db.query(getCartItemsQuery, [userId], (err, cartItems) => {
        if (err || cartItems.length === 0) {
          return res.status(400).json({ success: false, message: 'No items found in the cart for the user.' });
        }

        // STEP 1: Check stock for all cart items
        const stockChecks = cartItems.map(item => {
          return new Promise((resolve, reject) => {
            const checkStockQuery = `
              SELECT Stock_Quantity FROM Product WHERE Product_ID = ?
            `;
            db.query(checkStockQuery, [item.Product_ID], (err, result) => {
              if (err) return reject(err);
              const available = result[0].Stock_Quantity;
              if (available < item.Quantity) {
                return reject({
                  productId: item.Product_ID,
                  message: `Insufficient stock for Product ID ${item.Product_ID}. Available: ${available}, Requested: ${item.Quantity}`
                });
              }
              resolve();
            });
          });
        });

        Promise.all(stockChecks)
          .then(() => {
            // STEP 2: Proceed with order creation and delivery log
            const insertOrderQuery = 'INSERT INTO orders (user_id) VALUES (?)';
            db.query(insertOrderQuery, [userId], (err, result) => {
              if (err) {
                return res.status(500).json({ success: false, message: 'Failed to create order.' });
              }

              const orderId = result.insertId;

              const insertDeliveryQuery = `
                INSERT INTO delivery (user_id, product_id, quantity, order_id, address_id, del_partner_id)
                VALUES (?, ?, ?, ?, ?, ?)
              `;

              const insertPromises = cartItems.map(item => {
                return new Promise((resolve, reject) => {
                  db.query(
                    insertDeliveryQuery,
                    [userId, item.Product_ID, item.Quantity, orderId, addressId, delPartnerId],
                    (err) => {
                      if (err) return reject(err);

                      const updateStockQuery = `
                        UPDATE Product SET Stock_Quantity = Stock_Quantity - ? WHERE Product_ID = ?
                      `;
                      db.query(updateStockQuery, [item.Quantity, item.Product_ID], (err) => {
                        if (err) return reject(err);
                        resolve();
                      });
                    }
                  );
                });
              });

              Promise.all(insertPromises)
                .then(() => {
                  const clearCartQuery = 'DELETE FROM Cart WHERE User_ID = ?';
                  db.query(clearCartQuery, [userId], (err, result) => {
                    if (err) {
                      console.error('❌ Error clearing cart:', err);
                      return res.status(500).json({ success: false, message: 'Failed to clear cart.' });
                    }

                    res.json({ success: true, message: 'Order placed, stock updated, and cart cleared.', orderId });
                  });
                })
                .catch(err => {
                  console.error('❌ Error inserting delivery or updating stock:', err);
                  res.status(500).json({ success: false, message: 'Error inserting delivery or stock update.' });
                });
            });
          })
          .catch(stockError => {
            console.warn('⚠️ Stock issue:', stockError);
            res.status(400).json({
              success: false,
              message: stockError.message || 'Insufficient stock for one or more products.',
              productId: stockError.productId || null
            });
          });
      });
    });
  });
});


app.get('/api/checkCartStock/:userId', (req, res) => {
  const userId = req.params.userId;

  // Query to get cart items for the user
  const getCartItemsQuery = 'SELECT Product_ID, Quantity FROM Cart WHERE User_ID = ?';
  db.query(getCartItemsQuery, [userId], (err, cartItems) => {
      if (err || cartItems.length === 0) {
          return res.status(400).json({ success: false, message: 'No items found in the cart for the user.' });
      }

      const lowStockItems = [];
      const updatedCart = [];

      // Check stock for each item
      const stockCheckPromises = cartItems.map(item => {
          return new Promise((resolve, reject) => {
              const query = 'SELECT Stock_Quantity, Name FROM Product WHERE Product_ID = ?';
              db.query(query, [item.Product_ID], (err, result) => {
                  if (err) return reject(err);

                  if (!result.length || result[0].Stock_Quantity < item.Quantity) {
                      lowStockItems.push(`Low stock for product "${result[0]?.Name || 'Unknown'}".`);
                  } else {
                      updatedCart.push(item);
                  }
                  resolve();
              });
          });
      });

      Promise.all(stockCheckPromises)
          .then(() => {
              if (lowStockItems.length > 0) {
                  return res.status(400).json({ success: false, message: lowStockItems.join(', '), updatedCart });
              }

              res.json({ success: true, message: 'Stock is sufficient.' });
          })
          .catch(err => {
              console.error('Error checking stock:', err);
              res.status(500).json({ success: false, message: 'Error checking stock.' });
          });
  });
});


app.get("/getOrders", (req, res) => {
  const userId = req.session.userId;
  console.log("Fetching orders for user:", userId);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const sql = `
    SELECT 
      o.order_id,
      o.order_time,
      o.is_delivered,
      p.Name AS product_name,
      p.Price AS product_price,
      p.Product_Image,
      d.quantity,
      cs.total_pay,
      cs.smart_cart_fee,
      cs.delivery_fee,
      a.address_line,
      a.city,
      a.state,
      a.postal_code,
      a.country
    FROM orders o
    JOIN delivery d ON o.order_id = d.order_id
    JOIN addresses a ON a.id = d.address_id 
    JOIN Product p ON d.product_id = p.Product_ID
    LEFT JOIN cart_summary cs ON cs.summary_id = (
        SELECT cs2.summary_id
        FROM cart_summary cs2
        WHERE cs2.user_id = o.user_id
          AND cs2.created_at <= o.order_time
        ORDER BY cs2.created_at DESC
        LIMIT 1
    )
    WHERE o.user_id = ?
    ORDER BY o.order_time DESC

  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("❌ DB error while fetching orders:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }


    const groupedOrders = {};

    results.forEach(row => {
      if (!groupedOrders[row.order_id]) {
        groupedOrders[row.order_id] = {
          order_id: row.order_id,
          order_time: row.order_time,
          is_delivered: row.is_delivered,
          total_pay: row.total_pay,
          smart_cart_fee: row.smart_cart_fee,
          delivery_fee: row.delivery_fee,
          address: {
            address_line: row.address_line,
            city: row.city,
            state: row.state,
            postal_code: row.postal_code,
            country: row.country
          },
          products: []
        };
      }

      groupedOrders[row.order_id].products.push({
        name: row.product_name,
        price: row.product_price,
        quantity: row.quantity,
        image: row.Product_Image
      });
    });


    const ordersArray = Object.values(groupedOrders).sort(
      (a, b) => new Date(b.order_time) - new Date(a.order_time)
    );
    res.json(ordersArray);
    
  });
});
//add partner 
app.post('/api/addPartner/:locationId', p_upload.single('photo'), (req, res) => {
  const { name, aadhar_no, email, phone_number } = req.body;
  const location_id = req.params.locationId;

  // Use uploaded file's relative path if present
  const photoPath = req.file ? `/uploads/partner/${req.file.originalname}` : null;

  const sql = `
      INSERT INTO del_partner (name, aadhar_no, email, phone_number, photo, location_id)
      VALUES (?, ?, ?, ?, ?, ?)
  `;
  const values = [name, aadhar_no, email, phone_number, photoPath, location_id];

  db.query(sql, values, (err, result) => {
      if (err) {
          console.error('Error inserting into del_partner:', err);
          return res.status(500).json({ success: false, message: 'Failed to add delivery partner.' });
      }

      res.json({ success: true, message: 'Delivery partner added successfully.' });
  });
});



//
app.get('/api/deliveryPartners/:locationId', (req, res) => {
  const locationId = req.params.locationId;

  // Query to fetch delivery partners based on location_id
  const query = `
      SELECT dp.id, dp.name, dp.aadhar_no, dp.email, dp.phone_number, dp.photo, dp.location_id
      FROM del_partner dp
      WHERE dp.location_id = ?
  `;
  
  db.query(query, [locationId], (err, results) => {
      if (err) {
          console.error('Error fetching delivery partners:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
      }

      if (results.length === 0) {
          return res.status(404).json({ success: false, message: 'No delivery partners found' });
      }

      // Return the list of partners
      return res.json({
          success: true,
          partners: results
      });
  });
});

// API route to add a new delivery partner
app.post('/api/deliveryPartner', (req, res) => {
  const { name, aadhar_no, email, phone_number, photo, location_id } = req.body;

  // Check for duplicate aadhar_no, email, or phone_number
  const checkQuery = `
      SELECT id FROM del_partner 
      WHERE aadhar_no = ? OR email = ? OR phone_number = ?
  `;
  
  db.query(checkQuery, [aadhar_no, email, phone_number], (err, results) => {
      if (err) {
          console.error('Error checking duplicates:', err);
          return res.json({ success: false, message: 'Database error while checking duplicates' });
      }

      // If duplicates are found, return an alert message without setting a 400 status
      if (results.length > 0) {
          return res.json({ 
              success: false, 
              message: 'Duplicate Aadhar, Email, or Phone Number found. Please use unique details.' 
          });
      }

      // Insert the new partner if no duplicates are found
      const insertQuery = `
          INSERT INTO del_partner (name, aadhar_no, email, phone_number, photo, location_id)
          VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      db.query(insertQuery, [name, aadhar_no, email, phone_number, photo, location_id], (err, result) => {
          if (err) {
              console.error('Error inserting new partner:', err);
              return res.json({ success: false, message: 'Failed to insert new partner' });
          }

          return res.json({ success: true, message: 'Delivery partner added successfully' });
      });
  });
});

// API route to delete a delivery partner by ID
app.delete('/api/deletePartner/:id', (req, res) => {
  const partnerId = req.params.id;  // Get the partner ID from the URL parameter

  // Query to delete the partner by ID
  const deleteQuery = `
      DELETE FROM del_partner WHERE id = ?
  `;

  db.query(deleteQuery, [partnerId], (err, result) => {
      if (err) {
          console.error('Error deleting partner:', err);
          return res.status(500).json({ success: false, message: 'Failed to delete partner' });
      }

      if (result.affectedRows === 0) {
          // No partner was deleted, meaning the ID did not exist
          return res.status(404).json({ success: false, message: 'Partner not found' });
      }

      // Successfully deleted the partner
      return res.status(200).json({ success: true, message: 'Partner deleted successfully' });
  });
});
//
app.get('/api/getPartner/:id', (req, res) => {
  const partnerId = req.params.id;

  const query = `
      SELECT id, name, aadhar_no, email, phone_number, photo, location_id
      FROM del_partner WHERE id = ?
  `;

  db.query(query, [partnerId], (err, results) => {
      if (err) {
          console.error('Error fetching partner:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
      }

      if (results.length === 0) {
          return res.status(404).json({ success: false, message: 'Partner not found' });
      }

      return res.json({ success: true, partner: results[0] });
  });
});
//
//update del part


// server.js
const query = util.promisify(db.query).bind(db);

// Now use async/await safely
app.get("/searchData", async (req, res) => {
  const q = req.query.q?.trim();
  const pincode = req.query.pincode;

  if (!q || !pincode) return res.status(400).json({ error: "Missing query or pincode" });

  try {
    console.log("🔎 Search term:", q, "| 📍 Pincode:", pincode);

    const productRows = await query(
      "SELECT * FROM Product WHERE LOWER(Name) = LOWER(?)", [q]
    );
    if (productRows.length) {
      return res.json({ type: "product", data: productRows[0] });
    }

    const locationRows = await query(
      "SELECT Location_ID FROM Locations WHERE Pincode = ?", [pincode]
    );

    if (locationRows.length === 0) {
      return res.status(404).json({ error: "Location not found for the provided pincode" });
    }

    const locationId = locationRows[0].Location_ID;

    const subcatRows = await query(
      "SELECT * FROM Subcategory WHERE LOWER(Subcategory_Name) LIKE LOWER(?) AND Location_ID = ?", [`%${q}%`, locationId]
      // "SELECT * FROM Subcategory WHERE LOWER(Subcategory_Name) LIKE '%mango%' AND Location_ID = '211012'"

    );
    if (subcatRows.length) {
      return res.json({ type: "subcategory", data: subcatRows[0] });
    }

    const catRows = await query(
      "SELECT * FROM Category WHERE LOWER(Category_Name) LIKE LOWER(?)", [`%${q}%`]
    );
    if (catRows.length) {
      const categoryId = catRows[0].Category_ID;
      const subcats = await query(
        "SELECT * FROM Subcategory WHERE Category_ID = ? AND Location_ID = ?", [categoryId, locationId]
      );
      return res.json({ type: "category", data: subcats });
    }

    res.json({ type: "not_found" });
  } catch (err) {
    console.error("❌ Search error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.post('/api/saveCartSummary', (req, res) => {
  const { userId, itemTotal, smallCartFee, deliveryFee, totalToPay } = req.body;

  const sql = `INSERT INTO cart_summary (user_id, total_pay, smart_cart_fee, delivery_fee)
               VALUES (?, ?, ?, ?)`;

  db.query(sql, [userId, totalToPay, smallCartFee, deliveryFee], (err, result) => {
    if (err) {
      console.error('Error saving cart summary:', err);
      return res.status(500).send({ success: false, message: 'Database error' });
    }
    res.send({ success: true, message: 'Cart summary saved', summary_id: result.insertId });
  });
});


app.post('/api/getMyDeliveries', (req, res) => {
  console.log('Request body:', req.body);
  console.log("Received delivery email:", req.body.email);

  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

  const getPartnerIdQuery = 'SELECT id FROM del_partner WHERE email = ? LIMIT 1';

  db.query(getPartnerIdQuery, [email], (err, result) => {
    if (err || result.length === 0) {
      return res.status(400).json({ success: false, message: 'Delivery partner not found.' });
    }

    const partnerId = result[0].id;

    const getDeliveriesQuery = `
      SELECT d.order_id, d.product_id, d.quantity, a.address_line, a.city, a.state, a.postal_code, a.country, o.is_delivered
      FROM delivery d
      JOIN addresses a ON d.address_id = a.id
      JOIN orders o ON o.order_id = d.order_id
      WHERE d.del_partner_id = ?
    `;

    db.query(getDeliveriesQuery, [partnerId], (err, deliveries) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error fetching deliveries.' });
      }

      res.json({ success: true, deliveries });
    });
  });
});
//update
app.put('/api/updatePartner/:id', (req, res) => {
  const partnerId = req.params.id;
  const { name, aadhar_no, email, phone_number } = req.body;

  // Basic validation
  if (!aadhar_no || !/^\d{16}$/.test(aadhar_no)) {
    return res.json({ success: false, message: 'Aadhar number must be 16 digits' });
  }

  if (!phone_number || !/^\d{10}$/.test(phone_number)) {
    return res.json({ success: false, message: 'Phone number must be 10 digits' });
  }

  if (!email || email.trim() === '') {
    return res.json({ success: false, message: 'Email cannot be empty' });
  }

  const updateQuery = `
      UPDATE del_partner
      SET name = ?, aadhar_no = ?, email = ?, phone_number = ?
      WHERE id = ?
  `;

  db.query(updateQuery, [name, aadhar_no, email, phone_number, partnerId], (err, result) => {
    if (err) {
      console.error('Error updating partner:', err);
      return res.status(500).json({ success: false, message: 'Database error during update' });
    }

    if (result.affectedRows === 0) {
      return res.json({ success: false, message: 'Partner not found or no changes made' });
    }

    return res.json({ success: true, message: 'Partner updated successfully' });
  });
});


app.post('/api/update-delivery-status', (req, res) => {
  const { order_id } = req.body;

  const updateDeliveryQuery = 'UPDATE orders SET is_delivered = 1 WHERE order_id = ?';

  db.query(updateDeliveryQuery, [order_id], (err, result) => {
    if (err) {
      console.error('Error updating delivery status:', err);
      return res.status(500).json({ success: false, message: 'Error updating delivery status.' });
    }

    if (result.affectedRows > 0) {
      return res.status(200).json({ success: true, message: 'Delivery status updated.' });
    } else {
      return res.status(400).json({ success: false, message: 'Order not found or already updated.' });
    }
  });
});
app.get("/getOrders", (req, res) => {
  const userId = req.session.userId;
  console.log("Fetching orders for user:", req.session.userId);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const sql = `
    SELECT 
      o.order_id,
      o.order_time,
      p.Name AS product_name,
      p.Price AS product_price,
      p.Product_Image,
      d.quantity
    FROM orders o
    JOIN delivery d ON o.order_id = d.order_id
    JOIN Product p ON d.product_id = p.Product_ID
    WHERE o.user_id = ?
    ORDER BY o.order_time DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("❌ DB error while fetching orders:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    const groupedOrders = {};

    results.forEach(row => {
      if (!groupedOrders[row.order_id]) {
        groupedOrders[row.order_id] = {
          order_id: row.order_id,
          order_time: row.order_time,
          products: []
        };
      }

      groupedOrders[row.order_id].products.push({
        name: row.product_name,
        price: row.product_price,
        quantity: row.quantity,
        image: row.Product_Image
      });
    });

    const ordersArray = Object.values(groupedOrders);
    res.json(ordersArray);
  });
});

app.post('/update-product', (req, res) => {
  const {
      Product_ID,
      Name,
      Price,
      Stock_Quantity,
      Expiry_Date,
      Supplier_ID,
      Detail
  } = req.body;

  // Ensure all required fields are provided
  if (!Product_ID || !Name || !Price || !Stock_Quantity || !Expiry_Date || !Supplier_ID) {
      return res.status(400).json({
          success: false,
          message: 'Missing required fields'
      });
  }

  // Prepare the update SQL query
  const query = `
      UPDATE Product 
      SET 
          Name = ?, 
          Price = ?, 
          Stock_Quantity = ?, 
          Expiry_Date = ?, 
          Supplier_ID = ?, 
          Detail = ?
      WHERE Product_ID = ?
  `;

  const values = [Name, Price, Stock_Quantity, Expiry_Date, Supplier_ID, Detail, Product_ID];

  // Execute the query
  db.query(query, values, (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).json({
              success: false,
              message: 'Failed to update product',
              error: err.message
          });
      }

      if (result.affectedRows === 0) {
          return res.status(404).json({
              success: false,
              message: 'Product not found'
          });
      }

      // Send success response
      res.json({
          success: true,
          message: 'Product updated successfully'
      });
  });
});

app.listen(5000, () => console.log("🚀 Server running on port 5000"));
