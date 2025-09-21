// Test script for auth endpoints
// Run this in the browser console or as a Node.js script

const API_BASE = 'http://localhost:3000/api/auth';

// Test user registration
async function testUserRegistration() {
  console.log('Testing user registration...');
  
  const userData = {
    email: 'testuser@example.com',
    password: 'testpassword123',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890'
  };

  try {
    const response = await fetch(`${API_BASE}/register-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const result = await response.json();
    console.log('User registration result:', result);
    return result;
  } catch (error) {
    console.error('User registration error:', error);
    return null;
  }
}

// Test user login
async function testUserLogin() {
  console.log('Testing user login...');
  
  const loginData = {
    email: 'testuser@example.com',
    password: 'testpassword123',
    role: 'user'
  };

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });

    const result = await response.json();
    console.log('User login result:', result);
    return result;
  } catch (error) {
    console.error('User login error:', error);
    return null;
  }
}

// Test admin registration
async function testAdminRegistration() {
  console.log('Testing admin registration...');
  
  const adminData = {
    email: 'testadmin@example.com',
    password: 'adminpassword123',
    firstName: 'Test',
    lastName: 'Admin',
    phone: '+1234567891'
  };

  try {
    const response = await fetch(`${API_BASE}/register-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adminData),
    });

    const result = await response.json();
    console.log('Admin registration result:', result);
    return result;
  } catch (error) {
    console.error('Admin registration error:', error);
    return null;
  }
}

// Test admin login
async function testAdminLogin() {
  console.log('Testing admin login...');
  
  const loginData = {
    email: 'testadmin@example.com',
    password: 'adminpassword123',
    role: 'admin'
  };

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });

    const result = await response.json();
    console.log('Admin login result:', result);
    return result;
  } catch (error) {
    console.error('Admin login error:', error);
    return null;
  }
}

// Run all tests
async function runAllTests() {
  console.log('=== Starting Auth API Tests ===');
  
  // Test user flow
  console.log('\n--- User Flow ---');
  await testUserRegistration();
  await testUserLogin();
  
  // Test admin flow
  console.log('\n--- Admin Flow ---');
  await testAdminRegistration();
  await testAdminLogin();
  
  console.log('\n=== Tests Completed ===');
}

// Export functions for manual testing
if (typeof window !== 'undefined') {
  window.authTests = {
    testUserRegistration,
    testUserLogin,
    testAdminRegistration,
    testAdminLogin,
    runAllTests
  };
  console.log('Auth test functions available as window.authTests');
}

// Auto-run tests if this script is executed directly
// runAllTests();
