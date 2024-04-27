require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mysql = require('mysql');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const cookieParser = require('cookie-parser');

const app = express();
const port = 5000;

app.use(bodyParser.json());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(cookieParser());

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'sago'
});

// Signup route
app.post('/signup', async (req, res) => {
  const { userName, password, phoneNumber, userType, email } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query('INSERT INTO Users (name, password, phone_number, email, usertype) VALUES (?, ?, ?, ?, ?)', [userName, hashedPassword, phoneNumber, email, userType], (err, result) => {
      if (err) {
        console.error('Error signing up:', err);
        return res.status(500).send('Internal server error');
      }
      res.status(201).send('User created successfully');
    });
  } catch (error) {
    console.error('Error signing up:', error);
    res.status(500).send('Internal server error');
  }
});



// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM Users WHERE email = ?', [email], async (err, result) => {
    if (err) {
      console.error('Error in login:', err);
      return res.status(500).send('Internal server error');
    }
    
    if (result.length > 0) {
      const user = result[0];
      const passwordMatch = await bcrypt.compare(password, user.password);
      const user_model={user_id: user.user_id, emailId: user.email}
      const accessToken = jwt.sign(user_model, process.env.ACCESS_TOKEN_SECRET)

      if (passwordMatch) {
        //console.log(accessToken+" 345");
        return res.status(200).json({ accessToken });
      } else {
        return res.status(401).send('Invalid credentials');
      }
    } else {
      return res.status(404).send('User not found');
    }
  });
});

app.get('/protected-route', authenticateToken, (req, res) => {
  // Access token available in req.user
  res.send('Protected route accessed');
});

function authenticateToken(req, res, next) {
  const token = req.headers.authorization.split(' ')[1];
  //console.log("accessToken:", token);
  if (!token) {
    console.log("You don't have the token");
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decodedToken) => {
    
    if (err) {
      console.error("Error verifying token:", err);
      return res.sendStatus(403);
    }
    const user_id = decodedToken.user_id;

    if (!user_id) {
      console.error("No user_id found in token");
      return res.sendStatus(403);
    }
    if (!decodedToken || !decodedToken.user_id) {
      console.error("No user_id found in token");
      return res.sendStatus(403);
    }
    //console.log(user_id);
    req.user_id=user_id;
    next();
  });
}

app.post('/say-hi',authenticateToken, (req, res) => {
  res.send('hi');
});

// Route to fetch cart items for a specific user
app.post('/cart-items', authenticateToken, (req, res) => {
  //console.log("cart");
  // Extract user ID from the request
  const userId = req.user_id;
  //console.log(userId)
  // Query the database to retrieve cart items for the specified user
  db.query('SELECT * FROM cartitems WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error fetching cart items:', error);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
    //console.log(results);
    // Send the retrieved cart items as a response
    res.status(200).json({ success: true, cartItems: results });
  });
});

// Form submission route
// Define a route to handle form submission
app.post('/submit-form', (req, res) => {
  const { name, email, message } = req.body;

  // Insert the form data into the database
  db.query('INSERT INTO queries (name, email, message) VALUES (?, ?, ?)', [name, email, message], (error, results) => {
    if (error) {
      console.error('Error inserting data:', error);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
    console.log('Data inserted successfully:', results);
    return res.status(200).json({ success: true, message: 'Form submitted successfully' });
  });
});

// Route to fetch varieties from the database
app.post('/fetch-varieties-data', (req, res) => {
  const sql = 'SELECT * FROM varieties'; // Assuming 'varieties' is the name of your table
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching varieties:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(results); // Send the fetched data as JSON response
    }
  });
});
// Define the endpoint for updating products using POST
// app.post('/update-products', (req, res) => {
//   const updatedProducts = req.body;

//   // Iterate through the updated products and update them in the database
//   updatedProducts.forEach(product => {
//     db.query('UPDATE Varieties SET price = ?, quantity = ? WHERE id = ?', [product.price, product.quantity, product.id], (error, results) => {
//       if (error) {
//         console.error('Error updating product:', error);
//         return res.status(500).json({ success: false, error: 'Internal Server Error' });
//       }
//     });
//   });

//   // Send a response indicating success
//   return res.status(200).json({ success: true, message: 'Products updated successfully' });
// });

// Submit review route
app.post('/submit-review', (req, res) => {
  // Extract review data from request body
  const { userName, rating, reviewContent, productId } = req.body;

  // Insert review data into the database
  db.query(
    'INSERT INTO reviews (userName, rating, reviewContent, productId) VALUES (?, ?, ?, ?)',
    [userName, rating, reviewContent, productId],
    (error, results) => {
      if (error) {
        console.error('Error inserting review:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
      console.log('Review inserted successfully:', results);
      return res.status(200).json({ success: true, message: 'Review submitted successfully' });
    }
  );
});

// Route to fetch reviews for a specific product
app.get('/product/:productId/reviews', (req, res) => {
  const { productId } = req.params;

  // Query the database to retrieve reviews for the specified product
  db.query('SELECT * FROM reviews WHERE productId = ?', [productId], (error, results) => {
    if (error) {
      console.error('Error fetching reviews:', error);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
    // Send the retrieved reviews as a response
    res.status(200).json({ success: true, reviews: results });
  });
});

// Route to add a new item to the cart
app.post('/add-to-cart', authenticateToken, (req, res) => {
  // Extract user ID from the request
  const userId = req.user_id;

  // Extract product ID, quantity, and price from the request body
  const { productId, quantity, price } = req.body;

  // Insert the new item into the cartitems table
  db.query('INSERT INTO cartitems (user_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [userId, productId, quantity, price], (error, results) => {
    if (error) {
      console.error('Error adding item to cart:', error);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
    // Send a success response
    res.status(200).json({ success: true, message: 'Item added to cart successfully' });
  });
});

// Route to remove an item from the cart
app.post('/remove-from-cart', authenticateToken, (req, res) => {
  // Extract user ID from the request
  const userId = req.user_id;

  // Extract product ID from the request body
  const { productId } = req.body;

  // Delete the item from the cartitems table
  db.query('DELETE FROM cartitems WHERE user_id = ? AND product_id = ?', [userId, productId], (error, results) => {
    if (error) {
      console.error('Error removing item from cart:', error);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
    // Send a success response
    res.status(200).json({ success: true, message: 'Item removed from cart successfully' });
  });
});

// Route to handle adding a new product
app.post('/add-product', (req, res) => {
  // Extract product data from the request body
  const { name, price, quantity, description, discount } = req.body[0];
  console.log(req.body);
  console.log(name);
  // Insert the new product into the database
  db.query('INSERT INTO Varieties (name, price, quantity, about, discount) VALUES (?, ?, ?, ?, ?)', 
    [name, price, quantity, description, discount], 
    (error, results) => {
      if (error) {
        console.error('Error adding product:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
      // Return a success response
      return res.status(200).json({ success: true, message: 'Product added successfully' });
    }
  );
});


// Define the endpoint for updating products using POST
app.post('/update-products', (req, res) => {
  const updatedProducts = req.body;

  // Check if updatedProducts is an array
  if (!Array.isArray(updatedProducts)) {
    return res.status(400).json({ success: false, error: 'Invalid data format. Expected an array.' });
  }

  // Iterate through the updated products and update them in the database
  updatedProducts.forEach(product => {
    const { price, quantity, discount, id } = product;
    const query = 'UPDATE Varieties SET price = ?, quantity = ?, discount = ? WHERE id = ?';
    db.query(query, [price, quantity, discount, id], (error, results) => {
      if (error) {
        console.error('Error updating product:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
      console.log('Product updated:', results); // Log successful update
    });
  });

  // Send a success response after all products are updated
  res.status(200).json({ success: true, message: 'Products updated successfully' });
});
// Define an endpoint to fetch the list of customers
app.get('/customers', (req, res) => {
  // Query the database to retrieve customer data
  db.query('SELECT * FROM users', (error, results) => {
    if (error) {
      console.error('Error fetching customers:', error);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
    // Send the retrieved customer data as a response
    res.status(200).json({ success: true, customers: results });
  });
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});