const https = require('https');
const http = require('http');

const API_BASE = 'http://localhost:3000/api/auth';

// Helper function to make HTTP requests
function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// Test user registration
async function testUserRegistration() {
  console.log('🧪 Testing user registration...');
  
  const userData = {
    email: `testuser${Date.now()}@example.com`,
    password: 'testpassword123',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890'
  };

  try {
    const result = await makeRequest(`${API_BASE}/register-user`, userData);
    console.log('📊 User registration result:', result.status, result.data.success ? '✅' : '❌');
    if (result.data.success) {
      console.log('   User ID:', result.data.data.user.id);
      console.log('   Role:', result.data.data.user.role);
      console.log('   Email verified:', result.data.data.user.isEmailVerified);
    } else {
      console.log('   Error:', result.data.message);
    }
    return result.data;
  } catch (error) {
    console.error('❌ User registration error:', error.message);
    return null;
  }
}

// Test user login
async function testUserLogin() {
  console.log('\n🧪 Testing user login...');
  
  const loginData = {
    email: 'testuser@example.com',
    password: 'testpassword123',
    role: 'user'
  };

  try {
    const result = await makeRequest(`${API_BASE}/login`, loginData);
    console.log('📊 User login result:', result.status, result.data.success ? '✅' : '❌');
    if (result.data.success) {
      console.log('   User:', result.data.data.user.fullName);
      console.log('   Role:', result.data.data.user.role);
      console.log('   Token received:', !!result.data.data.tokens.accessToken);
    } else {
      console.log('   Error:', result.data.message);
    }
    return result.data;
  } catch (error) {
    console.error('❌ User login error:', error.message);
    return null;
  }
}

// Test admin registration
async function testAdminRegistration() {
  console.log('\n🧪 Testing admin registration...');
  
  const adminData = {
    email: `testadmin${Date.now()}@example.com`,
    password: 'adminpassword123',
    firstName: 'Test',
    lastName: 'Admin',
    phone: '+1234567891'
  };

  try {
    const result = await makeRequest(`${API_BASE}/register-admin`, adminData);
    console.log('📊 Admin registration result:', result.status, result.data.success ? '✅' : '❌');
    if (result.data.success) {
      console.log('   Admin ID:', result.data.data.user.id);
      console.log('   Role:', result.data.data.user.role);
      console.log('   Email verified:', result.data.data.user.isEmailVerified);
    } else {
      console.log('   Error:', result.data.message);
    }
    return result.data;
  } catch (error) {
    console.error('❌ Admin registration error:', error.message);
    return null;
  }
}

// Test admin login
async function testAdminLogin() {
  console.log('\n🧪 Testing admin login...');
  
  const loginData = {
    email: 'testadmin@example.com',
    password: 'adminpassword123',
    role: 'admin'
  };

  try {
    const result = await makeRequest(`${API_BASE}/login`, loginData);
    console.log('📊 Admin login result:', result.status, result.data.success ? '✅' : '❌');
    if (result.data.success) {
      console.log('   Admin:', result.data.data.user.fullName);
      console.log('   Role:', result.data.data.user.role);
      console.log('   Token received:', !!result.data.data.tokens.accessToken);
    } else {
      console.log('   Error:', result.data.message);
    }
    return result.data;
  } catch (error) {
    console.error('❌ Admin login error:', error.message);
    return null;
  }
}

// Test role validation
async function testRoleValidation() {
  console.log('\n🧪 Testing role validation...');
  
  // Try to login as admin with user credentials
  console.log('   Testing admin login with user credentials...');
  const invalidLoginData = {
    email: 'testuser@example.com',
    password: 'testpassword123',
    role: 'admin'
  };

  try {
    const result = await makeRequest(`${API_BASE}/login`, invalidLoginData);
    console.log('   Result:', result.status, result.data.success ? '❌ Should fail' : '✅ Correctly failed');
    if (!result.data.success) {
      console.log('   Expected error:', result.data.message);
    }
  } catch (error) {
    console.error('   Error:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Auth API Tests');
  console.log('=' .repeat(50));
  
  // Test user flow
  console.log('\n👤 USER AUTHENTICATION FLOW');
  console.log('-'.repeat(30));
  const userReg = await testUserRegistration();
  
  if (userReg && userReg.success) {
    // Use the email from registration for login test
    const loginData = {
      email: userReg.data.user.email,
      password: 'testpassword123',
      role: 'user'
    };
    
    console.log('\n🧪 Testing user login with registered account...');
    try {
      const result = await makeRequest(`${API_BASE}/login`, loginData);
      console.log('📊 User login result:', result.status, result.data.success ? '✅' : '❌');
      if (result.data.success) {
        console.log('   User:', result.data.data.user.fullName);
        console.log('   Role:', result.data.data.user.role);
      } else {
        console.log('   Error:', result.data.message);
      }
    } catch (error) {
      console.error('❌ User login error:', error.message);
    }
  }
  
  // Test admin flow
  console.log('\n👨‍💼 ADMIN AUTHENTICATION FLOW');
  console.log('-'.repeat(30));
  const adminReg = await testAdminRegistration();
  
  if (adminReg && adminReg.success) {
    // Use the email from registration for login test
    const loginData = {
      email: adminReg.data.user.email,
      password: 'adminpassword123',
      role: 'admin'
    };
    
    console.log('\n🧪 Testing admin login with registered account...');
    try {
      const result = await makeRequest(`${API_BASE}/login`, loginData);
      console.log('📊 Admin login result:', result.status, result.data.success ? '✅' : '❌');
      if (result.data.success) {
        console.log('   Admin:', result.data.data.user.fullName);
        console.log('   Role:', result.data.data.user.role);
      } else {
        console.log('   Error:', result.data.message);
      }
    } catch (error) {
      console.error('❌ Admin login error:', error.message);
    }
  }
  
  // Test role validation
  await testRoleValidation();
  
  console.log('\n🎉 Auth API Tests Completed');
  console.log('=' .repeat(50));
}

// Run tests
runAllTests().catch(console.error);
