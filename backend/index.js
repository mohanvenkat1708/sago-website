const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mysql = require('mysql');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const port = 5000;

app.use(bodyParser.json());
app.use(cors());


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
      if (passwordMatch) {
        const token = 'your_generated_jwt_token';
        return res.status(200).json({ token });
      } else {
        return res.status(401).send('Invalid credentials');
      }
    } else {
      return res.status(404).send('User not found');
    }
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
app.get('/varieties', (req, res) => {
    // Query the database to retrieve varieties
    db.query('SELECT * FROM Varieties', (error, results) => {
      if (error) {
        console.error('Error fetching varieties:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
      // Send the retrieved varieties as a response
      res.status(200).json(results);
    });
  });

  // Define the endpoint for updating products using POST
app.post('/update-products', (req, res) => {
    const updatedProducts = req.body;
  
    // Iterate through the updated products and update them in the database
    updatedProducts.forEach(product => {
      db.query('UPDATE Varieties SET price = ?, quantity = ? WHERE id = ?', [product.price, product.quantity, product.id], (error, results) => {
        if (error) {
          console.error('Error updating product:', error);
          return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
      });
    });
  
    // Send a response indicating success
    return res.status(200).json({ success: true, message: 'Products updated successfully' });
  });
  

  
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
  
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
