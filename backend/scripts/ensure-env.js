const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const examplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log('Created backend/.env from backend/.env.example.');
  } else {
    fs.writeFileSync(envPath, [
      'PORT=5000',
      'MONGO_URI=mongodb://127.0.0.1:27017/schulloop',
      'JWT_SECRET=schulloop_local_development_secret_change_before_production_2026',
      'JWT_EXPIRES_IN=24h',
      'FLUTTERWAVE_SECRET_KEY=',
      'FLUTTERWAVE_WEBHOOK_SECRET=',
      '',
    ].join('\n'));
    console.log('Created backend/.env with local development defaults.');
  }
}
