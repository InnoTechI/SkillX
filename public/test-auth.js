// Test auth API endpoints
async function testUserRegistration() {
  console.log('🧪 Testing User Registration...');
  
  const userData = {
    email: `testuser${Date.now()}@example.com`,
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890'
  };

  try {
    const response = await fetch('/api/auth/register-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });

    console.log('Status:', response.status);
    const result = await response.json();
    console.log('Response:', result);
    return result;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

async function testUserLogin(email) {
  console.log('🔐 Testing User Login...');
  
  const loginData = {
    email: email,
    password: 'password123',
    role: 'user'
  };

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    console.log('Status:', response.status);
    const result = await response.json();
    console.log('Response:', result);
    return result;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

async function testAdminRegistration() {
  console.log('👨‍💼 Testing Admin Registration...');
  
  const adminData = {
    email: `testadmin${Date.now()}@example.com`,
    password: 'password123',
    firstName: 'Test',
    lastName: 'Admin',
    phone: '+1234567891'
  };

  try {
    const response = await fetch('/api/auth/register-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adminData)
    });

    console.log('Status:', response.status);
    const result = await response.json();
    console.log('Response:', result);
    return result;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting Auth API Tests');
  console.log('='.repeat(50));
  
  // Test user registration
  const userResult = await testUserRegistration();
  
  if (userResult && userResult.success) {
    // Test user login with the registered email
    await testUserLogin(userResult.data.user.email);
  }
  
  // Test admin registration
  await testAdminRegistration();
  
  console.log('✅ Tests completed!');
}

// Make functions available globally
window.authTests = {
  testUserRegistration,
  testUserLogin,
  testAdminRegistration,
  runTests
};

console.log('📋 Auth test functions loaded!');
console.log('💡 Run: authTests.runTests() to test all endpoints');