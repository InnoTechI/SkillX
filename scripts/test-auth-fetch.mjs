import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api/auth';

console.log('🚀 Starting Authentication API Tests\n');

// Test User Registration
async function testUserRegistration() {
  console.log('👤 Testing User Registration...');
  
  const userData = {
    email: `testuser${Date.now()}@example.com`,
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
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   Message: ${result.message}`);
    
    if (result.success) {
      console.log(`   User ID: ${result.data.user.id}`);
      console.log(`   Role: ${result.data.user.role}`);
      console.log(`   Email: ${result.data.user.email}`);
      console.log(`   Email Verified: ${result.data.user.isEmailVerified}`);
      console.log(`   Token Length: ${result.data.tokens.accessToken.length} chars`);
      return result.data.user;
    } else {
      console.log(`   Error: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.error(`   ❌ Network Error: ${error.message}`);
    return null;
  }
}

// Test Admin Registration
async function testAdminRegistration() {
  console.log('\n👨‍💼 Testing Admin Registration...');
  
  const adminData = {
    email: `testadmin${Date.now()}@example.com`,
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
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   Message: ${result.message}`);
    
    if (result.success) {
      console.log(`   Admin ID: ${result.data.user.id}`);
      console.log(`   Role: ${result.data.user.role}`);
      console.log(`   Email: ${result.data.user.email}`);
      console.log(`   Email Verified: ${result.data.user.isEmailVerified}`);
      console.log(`   Token Length: ${result.data.tokens.accessToken.length} chars`);
      return result.data.user;
    } else {
      console.log(`   Error: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.error(`   ❌ Network Error: ${error.message}`);
    return null;
  }
}

// Test Login
async function testLogin(email, password, role) {
  console.log(`\n🔐 Testing ${role.charAt(0).toUpperCase() + role.slice(1)} Login...`);
  
  const loginData = {
    email,
    password,
    role
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
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   Message: ${result.message}`);
    
    if (result.success) {
      console.log(`   User: ${result.data.user.fullName}`);
      console.log(`   Role: ${result.data.user.role}`);
      console.log(`   Token Length: ${result.data.tokens.accessToken.length} chars`);
    } else {
      console.log(`   Error: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error(`   ❌ Network Error: ${error.message}`);
    return null;
  }
}

// Test Role Validation
async function testRoleValidation(userEmail, adminEmail) {
  console.log('\n🔒 Testing Role Validation...');
  
  // Try to login as admin with user credentials
  console.log('   Testing: User credentials with admin role');
  const userAsAdmin = await testLogin(userEmail, 'testpassword123', 'admin');
  console.log(`   Result: ${userAsAdmin && !userAsAdmin.success ? '✅ Correctly rejected' : '❌ Should have been rejected'}`);
  
  // Try to login as user with admin credentials  
  console.log('   Testing: Admin credentials with user role');
  const adminAsUser = await testLogin(adminEmail, 'adminpassword123', 'user');
  console.log(`   Result: ${adminAsUser && !adminAsUser.success ? '✅ Correctly rejected' : '❌ Should have been rejected'}`);
}

// Run all tests
async function runAllTests() {
  try {
    console.log('=' .repeat(60));
    console.log('🧪 AUTHENTICATION API TEST SUITE');
    console.log('=' .repeat(60));
    
    // Test registrations
    const user = await testUserRegistration();
    const admin = await testAdminRegistration();
    
    if (user && admin) {
      // Test logins with correct roles
      await testLogin(user.email, 'testpassword123', 'user');
      await testLogin(admin.email, 'adminpassword123', 'admin');
      
      // Test role validation
      await testRoleValidation(user.email, admin.email);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 All tests completed!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run the tests
runAllTests();
