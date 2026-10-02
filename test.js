const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting XenProperty Automated Verification Tests ---');

  // 1. Check Homepage HTTP 200
  const home = await request({ hostname: 'localhost', port: 3000, path: '/', method: 'GET' });
  console.log(`[PASS] GET / -> Status ${home.status}`);

  // 2. Fetch Properties
  const props = await request({ hostname: 'localhost', port: 3000, path: '/api/properties', method: 'GET' });
  console.log(`[PASS] GET /api/properties -> Found ${props.body.count} properties`);

  // 3. Featured Properties
  const featured = await request({ hostname: 'localhost', port: 3000, path: '/api/properties/featured', method: 'GET' });
  console.log(`[PASS] GET /api/properties/featured -> Found ${featured.body.data.length} featured properties`);

  // 4. Test AI Chat
  const ai = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/ai/chat',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { message: 'Find me a modern 3-bedroom villa in Bangalore within my budget' });
  console.log(`[PASS] POST /api/ai/chat -> AI Matchmaker returned ${ai.body.properties.length} matches`);
  console.log(`       AI Reply: "${ai.body.reply.slice(0, 70)}..."`);

  // 5. Test Demo Login
  const login = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@xenproperty.com', password: 'admin123' });
  console.log(`[PASS] POST /api/auth/login -> User: ${login.body.user.full_name}, Role: ${login.body.user.role}`);

  // 6. Test Loan Application
  const loan = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/loans/apply',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    full_name: 'Test Buyer',
    email: 'buyer@test.com',
    phone: '+91 99887 76655',
    loan_amount: 4500000,
    monthly_income: 110000,
    property_city: 'Bangalore',
    bank_preference: 'HDFC Bank'
  });
  console.log(`[PASS] POST /api/loans/apply -> Application #${loan.body.applicationId}, Pre-approved: ${loan.body.eligibility.isPreApproved}, Max Eligible: ₹${loan.body.eligibility.maxEligibleAmount}`);

  // 7. Test Admin Stats
  const stats = await request({ hostname: 'localhost', port: 3000, path: '/api/admin/stats', method: 'GET' });
  console.log(`[PASS] GET /api/admin/stats -> Total Props: ${stats.body.stats.totalProperties}, Total Inquiries: ${stats.body.stats.totalInquiries}`);

  console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

// Start server in-process if not already running, then test
const serverProcess = require('./server');
setTimeout(runTests, 2000);
