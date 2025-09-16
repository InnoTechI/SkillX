// Copy and paste this into the browser console at http://localhost:3000
// to test the authentication endpoints

console.log('🚀 Starting Auth Tests in Browser');

// Test User Registration
async function testUserReg() {
  console.log('\n👤 Testing User Registration...');
  const userData = {
    email: `user${Date.now()}@test.com`,
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890'
  };
  
  try {
    const response = await fetch('/api/auth/register-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const result = await response.json();
    console.log('📊 User Registration Result:', result.success ? '✅' : '❌');
    console.log('📋 Response:', result);
    return result;
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

// Test Admin Registration  
async function testAdminReg() {
  console.log('\n👨‍💼 Testing Admin Registration...');
  const adminData = {
    email: `admin${Date.now()}@test.com`,
    password: 'password123',
    firstName: 'Test',
    lastName: 'Admin',
    phone: '+1234567891'
  };
  
  try {
    const response = await fetch('/api/auth/register-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminData)
    });
    const result = await response.json();
    console.log('📊 Admin Registration Result:', result.success ? '✅' : '❌');
    console.log('📋 Response:', result);
    return result;
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

// Test User Login
async function testUserLogin(email) {
  console.log('\n🔐 Testing User Login...');
  const loginData = {
    email: email,
    password: 'password123',
    role: 'user'
  };
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    });
    const result = await response.json();
    console.log('📊 User Login Result:', result.success ? '✅' : '❌');
    console.log('📋 Response:', result);
    return result;
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

// Test Admin Login
async function testAdminLogin(email) {
  console.log('\n🔐 Testing Admin Login...');
  const loginData = {
    email: email,
    password: 'password123',
    role: 'admin'
  };
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    });
    const result = await response.json();
    console.log('📊 Admin Login Result:', result.success ? '✅' : '❌');
    console.log('📋 Response:', result);
    return result;
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

// Run all tests
async function runTests() {
  console.log('🎯 Running Complete Auth Test Suite');
  console.log('='.repeat(50));
  
  // Test user registration and login
  const userResult = await testUserReg();
  if (userResult && userResult.success) {
    await testUserLogin(userResult.data.user.email);
  }
  
  // Test admin registration and login
  const adminResult = await testAdminReg();
  if (adminResult && adminResult.success) {
    await testAdminLogin(adminResult.data.user.email);
  }
  
  console.log('\n🎉 Auth tests completed!');
  console.log('='.repeat(50));
}

// Make functions available globally
window.authTest = {
  testUserReg,
  testAdminReg,
  testUserLogin,
  testAdminLogin,
  runTests
};

console.log('✅ Auth test functions loaded!');
console.log('💡 Run: authTest.runTests() to test all endpoints');
console.log('📋 Available functions: testUserReg, testAdminReg, testUserLogin, testAdminLogin, runTests');
