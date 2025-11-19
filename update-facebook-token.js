/**
 * Quick script to update Facebook token
 * Run: node update-facebook-token.js
 */

const newToken = 'EAAQ06lHY7RYBP9Try50P6CavpZBFrclnO1IICsyAAzrOOFPzn0jStaMMWkb2x5STqik8ctTBZCCEMzXtabWob6bIe5kq8FzDMnLOygskIQf3ZA8HdCZCtEQI6zBb3cX08QgMzmFSJCG5Uzw6tHYPZABIXZC4lYf1eYtBcWVqKJAXRAAlWpgxZCw7SUIM79HMsBXrXuStah3QJiu1JFga0RjIxFyW35I45Q6srSd8HJZApKCqPN6JOxgQTc1CYnW2ANawpuLKHCT4BisL'

console.log('📋 Copy this command and run it in your browser console (on your app, while logged in):\n')
console.log(`fetch('/api/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    facebookAccessToken: '${newToken}'
  })
}).then(r => r.json()).then(data => {
  console.log('✅ Token saved!', data);
  alert('Facebook token updated successfully!');
}).catch(err => {
  console.error('❌ Error:', err);
  alert('Error: ' + err.message);
});`)

