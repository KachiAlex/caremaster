const http = require('http');
const data = JSON.stringify({ email: 'admin@getcaremaster.com', password: '***REMOVED***' });
const options = {
  hostname: 'localhost',
  port: 5002,
  path: '/api/auth/email-login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
};
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log(res.statusCode, body));
});
req.write(data);
req.end();
