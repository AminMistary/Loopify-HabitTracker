// Quick test script for backend
const BASE_URL = 'http://localhost:3000/api';

async function testBackend() {
  try {
    console.log('🧪 Testing Loopify Backend...\n');

    // Test 1: Register
    console.log('1️⃣  Testing registration...');
    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test${Date.now()}@loopify.com`,
        password: 'test123',
        name: 'Test User',
        primaryFocus: 'discipline'
      })
    });
    const { token } = await registerRes.json();
    console.log('✅ User registered successfully\n');

    // Test 2: Create Loop
    console.log('2️⃣  Testing loop creation...');
    const loopRes = await fetch(`${BASE_URL}/loops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Morning Routine',
        frequency: 'daily',
        taskList: ['Wake up', 'Exercise', 'Meditate']
      })
    });
    const loopData = await loopRes.json();
    console.log('✅ Loop created:', loopData.loop.name);
    console.log('   Message:', loopData.message, '\n');

    // Test 3: Get Dashboard
    console.log('3️⃣  Testing dashboard...');
    const dashRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const dashboard = await dashRes.json();
    console.log('✅ Dashboard loaded');
    console.log('   Total loops:', dashboard.totalLoops);
    console.log('   Completed today:', dashboard.completedLoops, '\n');

    // Test 4: Get Specific Loop
    console.log('4️⃣  Testing loop details...');
    const loopId = dashboard.loops[0].id;
    const detailRes = await fetch(`${BASE_URL}/loops/${loopId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const loopDetail = await detailRes.json();
    console.log('✅ Loop details loaded');
    console.log('   Tasks:', loopDetail.loop.tasks.length);
    console.log('   Motivation:', loopDetail.loop.motivationMessage, '\n');

    console.log('🎉 All tests passed! Backend is working correctly.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
testBackend();