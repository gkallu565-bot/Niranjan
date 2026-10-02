const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbRun, dbAll, dbGet, initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'xenproperty_super_secret_jwt_key_2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for image uploads
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'prop-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Authentication Helper Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

/* ==========================================================================
   AUTHENTICATION ROUTES
   ========================================================================== */

app.post('/api/auth/register', async (req, res) => {
  try {
    const { full_name, email, password, phone, role } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
    }

    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const assignedRole = role === 'agent' || role === 'admin' ? role : 'user';

    const result = await dbRun(
      'INSERT INTO users (full_name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)',
      [full_name.trim(), email.toLowerCase().trim(), passwordHash, phone || '', assignedRole]
    );

    const user = { id: result.lastID, full_name, email: email.toLowerCase().trim(), role: assignedRole };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const payload = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: payload
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error fetching user.' });
  }
});

/* ==========================================================================
   PROPERTIES ROUTES
   ========================================================================== */

app.get('/api/properties', async (req, res) => {
  try {
    const { type, city, property_type, min_price, max_price, beds, search, sort, limit, offset } = req.query;

    let sql = 'SELECT * FROM properties WHERE 1=1';
    const params = [];

    if (type && type !== 'all') {
      sql += ' AND listing_type = ?';
      params.push(type.toLowerCase());
    }

    if (city && city !== 'all' && city.trim() !== '') {
      sql += ' AND (LOWER(city) LIKE ? OR LOWER(address) LIKE ?)';
      params.push(`%${city.toLowerCase().trim()}%`, `%${city.toLowerCase().trim()}%`);
    }

    if (property_type && property_type !== 'all' && property_type.trim() !== '') {
      sql += ' AND LOWER(property_type) = ?';
      params.push(property_type.toLowerCase().trim());
    }

    if (min_price) {
      sql += ' AND price >= ?';
      params.push(Number(min_price));
    }

    if (max_price) {
      sql += ' AND price <= ?';
      params.push(Number(max_price));
    }

    if (beds && beds !== 'all') {
      const bedsNum = parseInt(beds);
      if (bedsNum >= 4) {
        sql += ' AND beds >= 4';
      } else if (!isNaN(bedsNum)) {
        sql += ' AND beds = ?';
        params.push(bedsNum);
      }
    }

    if (search && search.trim() !== '') {
      const q = `%${search.toLowerCase().trim()}%`;
      sql += ' AND (LOWER(title) LIKE ? OR LOWER(city) LIKE ? OR LOWER(state) LIKE ? OR LOWER(address) LIKE ? OR LOWER(description) LIKE ?)';
      params.push(q, q, q, q, q);
    }

    if (sort === 'price_asc') {
      sql += ' ORDER BY price ASC';
    } else if (sort === 'price_desc') {
      sql += ' ORDER BY price DESC';
    } else if (sort === 'ai_match') {
      sql += ' ORDER BY ai_match_pct DESC';
    } else if (sort === 'location') {
      sql += ' ORDER BY location_score DESC';
    } else {
      sql += ' ORDER BY is_featured DESC, id DESC';
    }

    if (limit) {
      sql += ' LIMIT ?';
      params.push(Number(limit));
      if (offset) {
        sql += ' OFFSET ?';
        params.push(Number(offset));
      }
    }

    const properties = await dbAll(sql, params);

    const formatted = properties.map((p) => {
      let amenitiesList = [];
      let additionalImgList = [];
      try { amenitiesList = p.amenities ? JSON.parse(p.amenities) : []; } catch (e) { amenitiesList = [p.amenities]; }
      try { additionalImgList = p.additional_images ? JSON.parse(p.additional_images) : []; } catch (e) { additionalImgList = []; }
      return {
        ...p,
        amenities: amenitiesList,
        additional_images: additionalImgList
      };
    });

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    console.error('Properties fetch error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving properties.' });
  }
});

app.get('/api/properties/featured', async (req, res) => {
  try {
    const featured = await dbAll('SELECT * FROM properties WHERE is_featured = 1 ORDER BY id ASC LIMIT 6');
    const formatted = featured.map((p) => {
      let amenitiesList = [];
      try { amenitiesList = p.amenities ? JSON.parse(p.amenities) : []; } catch (e) { amenitiesList = []; }
      return { ...p, amenities: amenitiesList };
    });
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving featured properties.' });
  }
});

app.get('/api/properties/:id', async (req, res) => {
  try {
    const property = await dbGet('SELECT * FROM properties WHERE id = ?', [req.params.id]);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    let amenitiesList = [];
    let additionalImgList = [];
    try { amenitiesList = property.amenities ? JSON.parse(property.amenities) : []; } catch (e) { amenitiesList = [property.amenities]; }
    try { additionalImgList = property.additional_images ? JSON.parse(property.additional_images) : []; } catch (e) { additionalImgList = []; }

    res.json({
      success: true,
      data: {
        ...property,
        amenities: amenitiesList,
        additional_images: additionalImgList
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving property details.' });
  }
});

app.post('/api/properties', upload.single('image'), async (req, res) => {
  try {
    const {
      title, listing_type, property_type, price, city, state, address,
      beds, baths, area_sqft, description, amenities, furnishing, image_url
    } = req.body;

    if (!title || !listing_type || !price || !city) {
      return res.status(400).json({ success: false, message: 'Please provide required property details.' });
    }

    let finalImageUrl = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';
    if (req.file) {
      finalImageUrl = `/uploads/${req.file.filename}`;
    } else if (image_url && image_url.trim() !== '') {
      finalImageUrl = image_url.trim();
    }

    const numericPrice = Number(price);
    let priceDisplay = '';
    if (listing_type === 'rent') {
      priceDisplay = `₹${numericPrice.toLocaleString('en-IN')} / month`;
    } else if (numericPrice >= 10000000) {
      priceDisplay = `₹${(numericPrice / 10000000).toFixed(2)} Cr`;
    } else {
      priceDisplay = `₹${(numericPrice / 100000).toFixed(2)} Lakh`;
    }

    let amenitiesJson = '[]';
    if (amenities) {
      if (Array.isArray(amenities)) {
        amenitiesJson = JSON.stringify(amenities);
      } else {
        const split = amenities.split(',').map((s) => s.trim()).filter(Boolean);
        amenitiesJson = JSON.stringify(split);
      }
    }

    const aiMatchPct = Math.floor(Math.random() * 8) + 90;
    const locationScore = (Math.floor(Math.random() * 10) + 88) / 10;
    const lifestyleScore = Math.floor(Math.random() * 8) + 89;

    const result = await dbRun(
      `INSERT INTO properties (
        title, listing_type, property_type, price, price_display, city, state, address,
        beds, baths, area_sqft, image_url, additional_images, ai_match_pct, location_score,
        lifestyle_score, description, amenities, furnishing, is_verified, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [
        title, listing_type.toLowerCase(), property_type || 'Apartment', numericPrice, priceDisplay,
        city, state || 'India', address || city, Number(beds) || 0, Number(baths) || 0,
        Number(area_sqft) || 1000, finalImageUrl, JSON.stringify([finalImageUrl]),
        aiMatchPct, locationScore, lifestyleScore, description || '', amenitiesJson, furnishing || 'Semi-Furnished'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Property listed successfully!',
      propertyId: result.lastID
    });
  } catch (err) {
    console.error('Create property error:', err);
    res.status(500).json({ success: false, message: 'Server error listing property.' });
  }
});

app.delete('/api/properties/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM properties WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Property deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting property.' });
  }
});

/* ==========================================================================
   AI PROPERTY ASSISTANT & CHATBOT API
   ========================================================================== */

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const lower = message.toLowerCase();
    let queryConditions = [];
    let queryParams = [];

    const cities = ['bangalore', 'mumbai', 'hyderabad', 'pune', 'gurgaon', 'delhi', 'kochi'];
    let matchedCity = cities.find((c) => lower.includes(c));
    if (matchedCity) {
      queryConditions.push('LOWER(city) LIKE ?');
      queryParams.push(`%${matchedCity}%`);
    }

    if (lower.includes('1 bed') || lower.includes('1bhk') || lower.includes('1-bedroom') || lower.includes('studio')) {
      queryConditions.push('beds = 1');
    } else if (lower.includes('2 bed') || lower.includes('2bhk') || lower.includes('2-bedroom')) {
      queryConditions.push('beds = 2');
    } else if (lower.includes('3 bed') || lower.includes('3bhk') || lower.includes('3-bedroom')) {
      queryConditions.push('beds = 3');
    } else if (lower.includes('4 bed') || lower.includes('4bhk') || lower.includes('4-bedroom')) {
      queryConditions.push('beds >= 4');
    }

    if (lower.includes('villa')) {
      queryConditions.push('LOWER(property_type) = ?');
      queryParams.push('villa');
    } else if (lower.includes('apartment') || lower.includes('flat')) {
      queryConditions.push('LOWER(property_type) = ?');
      queryParams.push('apartment');
    } else if (lower.includes('penthouse')) {
      queryConditions.push('LOWER(property_type) = ?');
      queryParams.push('penthouse');
    } else if (lower.includes('commercial') || lower.includes('office')) {
      queryConditions.push('listing_type = ?');
      queryParams.push('commercial');
    }

    if (lower.includes('rent') || lower.includes('lease') || lower.includes('monthly')) {
      queryConditions.push("listing_type = 'rent'");
    } else if (lower.includes('buy') || lower.includes('purchase')) {
      queryConditions.push("listing_type = 'buy'");
    }

    let sql = 'SELECT * FROM properties';
    if (queryConditions.length > 0) {
      sql += ' WHERE ' + queryConditions.join(' AND ');
    }
    sql += ' ORDER BY ai_match_pct DESC LIMIT 4';

    let properties = await dbAll(sql, queryParams);

    if (properties.length === 0) {
      properties = await dbAll('SELECT * FROM properties ORDER BY ai_match_pct DESC LIMIT 3');
    }

    let responseText = '';
    if (matchedCity) {
      responseText = `I analyzed our AI ecosystem for verified properties in ${matchedCity.charAt(0).toUpperCase() + matchedCity.slice(1)}. Here are the top verified properties that align perfectly with your preferences:`;
    } else if (lower.includes('villa')) {
      responseText = `I curated the premier luxury villas featuring private amenities and superior location scores. Here are your top matches:`;
    } else if (lower.includes('rent')) {
      responseText = `Here are prime rental residences curated with high lifestyle ratings and verified documentation:`;
    } else if (lower.includes('loan') || lower.includes('interest') || lower.includes('emi')) {
      responseText = `XenProperty partners with top Indian lenders (HDFC, SBI, ICICI) with rates starting from 8.40% p.a. You can check instant eligibility on our Home Loans page, or explore these pre-approved properties below:`;
    } else {
      responseText = `Here are the top properties matching your criteria with verified documentation and high AI Match ratings:`;
    }

    res.json({
      success: true,
      reply: responseText,
      properties: properties.map((p) => {
        let amenitiesList = [];
        try { amenitiesList = JSON.parse(p.amenities); } catch (e) { amenitiesList = []; }
        return { ...p, amenities: amenitiesList };
      })
    });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ success: false, message: 'Error generating AI recommendations.' });
  }
});

/* ==========================================================================
   INQUIRIES & SITE VISITS
   ========================================================================== */

app.post('/api/inquiries', async (req, res) => {
  try {
    const { property_id, property_title, user_name, user_email, user_phone, visit_date, visit_time, visit_type, message } = req.body;
    if (!user_name || !user_email || !user_phone) {
      return res.status(400).json({ success: false, message: 'Please provide your name, email, and phone number.' });
    }

    const result = await dbRun(
      `INSERT INTO inquiries (
        property_id, property_title, user_name, user_email, user_phone,
        visit_date, visit_time, visit_type, message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        property_id || null,
        property_title || 'General Inquiry',
        user_name.trim(),
        user_email.trim(),
        user_phone.trim(),
        visit_date || null,
        visit_time || null,
        visit_type || 'in_person',
        message || ''
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Your inquiry and visit request have been scheduled! An agent will connect with you within 30 minutes.',
      inquiryId: result.lastID
    });
  } catch (err) {
    console.error('Inquiry error:', err);
    res.status(500).json({ success: false, message: 'Error scheduling inquiry.' });
  }
});

app.get('/api/inquiries', async (req, res) => {
  try {
    const inquiries = await dbAll('SELECT * FROM inquiries ORDER BY id DESC');
    res.json({ success: true, data: inquiries });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching inquiries.' });
  }
});

/* ==========================================================================
   HOME LOANS API
   ========================================================================== */

app.post('/api/loans/apply', async (req, res) => {
  try {
    const { full_name, email, phone, loan_amount, monthly_income, property_city, employment_type, bank_preference } = req.body;
    if (!full_name || !email || !phone || !loan_amount || !monthly_income) {
      return res.status(400).json({ success: false, message: 'Please provide all required loan application details.' });
    }

    const result = await dbRun(
      `INSERT INTO loan_applications (
        full_name, email, phone, loan_amount, monthly_income,
        property_city, employment_type, bank_preference
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name.trim(),
        email.trim(),
        phone.trim(),
        Number(loan_amount),
        Number(monthly_income),
        property_city || 'Not Specified',
        employment_type || 'Salaried',
        bank_preference || 'HDFC Bank'
      ]
    );

    const maxEligible = Number(monthly_income) * 60;
    const isPreApproved = Number(loan_amount) <= maxEligible;

    res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully!',
      applicationId: result.lastID,
      eligibility: {
        isPreApproved,
        maxEligibleAmount: maxEligible,
        estimatedEMI: Math.round((Number(loan_amount) * 0.085 * Math.pow(1 + 0.085 / 12, 240)) / (Math.pow(1 + 0.085 / 12, 240) - 1) / 12)
      }
    });
  } catch (err) {
    console.error('Loan apply error:', err);
    res.status(500).json({ success: false, message: 'Error processing loan application.' });
  }
});

app.get('/api/loans', async (req, res) => {
  try {
    const loans = await dbAll('SELECT * FROM loan_applications ORDER BY id DESC');
    res.json({ success: true, data: loans });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving loan applications.' });
  }
});

/* ==========================================================================
   DESIGN STUDIO API
   ========================================================================== */

app.post('/api/design/request', async (req, res) => {
  try {
    const { full_name, email, phone, service_type, property_area, budget_range, message } = req.body;
    if (!full_name || !email || !phone || !service_type) {
      return res.status(400).json({ success: false, message: 'Please complete all required fields.' });
    }

    const result = await dbRun(
      `INSERT INTO design_requests (
        full_name, email, phone, service_type, property_area, budget_range, message
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name.trim(),
        email.trim(),
        phone.trim(),
        service_type,
        property_area ? Number(property_area) : null,
        budget_range || 'Moderate',
        message || ''
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Design consultation scheduled! Our senior architect will contact you with initial 3D mood boards.',
      requestId: result.lastID
    });
  } catch (err) {
    console.error('Design request error:', err);
    res.status(500).json({ success: false, message: 'Error submitting design request.' });
  }
});

app.get('/api/design/requests', async (req, res) => {
  try {
    const requests = await dbAll('SELECT * FROM design_requests ORDER BY id DESC');
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching design requests.' });
  }
});

/* ==========================================================================
   ADMIN STATISTICS API
   ========================================================================== */

app.get('/api/admin/stats', async (req, res) => {
  try {
    const propCount = await dbGet('SELECT COUNT(*) as count FROM properties');
    const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
    const inquiryCount = await dbGet('SELECT COUNT(*) as count FROM inquiries');
    const loanCount = await dbGet('SELECT COUNT(*) as count FROM loan_applications');
    const designCount = await dbGet('SELECT COUNT(*) as count FROM design_requests');

    res.json({
      success: true,
      stats: {
        totalProperties: propCount.count,
        totalUsers: userCount.count,
        totalInquiries: inquiryCount.count,
        totalLoanApplications: loanCount.count,
        totalDesignRequests: designCount.count
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error loading admin stats.' });
  }
});

// Single Page application / fallback routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server Initialization
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` XenProperty Server Running on http://localhost:${PORT}`);
      console.log(` Built with HTML, CSS, JavaScript, Node.js & SQLite`);
      console.log(`====================================================`);
    });
  })
  .catch((err) => {
    console.error('Failed to start XenProperty server:', err);
  });
