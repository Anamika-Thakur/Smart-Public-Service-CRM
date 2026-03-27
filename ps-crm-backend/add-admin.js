require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

async function addAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'gov.grievance.system@gmail.com' });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      mongoose.disconnect();
      return;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('pass123', salt);

    // Create new admin user
    const admin = new User({
      name: 'Government Grievance System Admin',
      email: 'gov.grievance.system@gmail.com',
      password: hashedPassword,
      role: 'admin',
      status: 'active'
    });

    // Save the admin user
    await admin.save();
    console.log('Admin user created successfully!');
    console.log(`Email: gov.grievance.system@gmail.com`);
    console.log(`Password: pass123`);
    console.log(`Role: admin`);

    mongoose.disconnect();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error.message);
    mongoose.disconnect();
    process.exit(1);
  }
}

addAdmin();
