const User = require('../models/User');

const seedAdmins = async () => {
  try {
    const adminAccounts = [
      {
        name: 'Syed Zain (Admin 1)',
        email: 'syedzain7000@gmail.com',
        password: 'zainadmin1',
        phone: '+92 325 8866620',
        role: 'admin',
      },
      {
        name: 'Wasay Rajput (Admin 2)',
        email: 'rajpootwasay77@gmail.com',
        password: 'wasayadmin2',
        phone: '+92 309 6308146',
        role: 'admin',
      },
    ];

    for (const adminData of adminAccounts) {
      const existingUser = await User.findOne({ email: adminData.email });
      if (!existingUser) {
        await User.create(adminData);
        console.log(`✅ Admin Account Created: ${adminData.email}`);
      } else {
        // Ensure role is admin
        if (existingUser.role !== 'admin') {
          existingUser.role = 'admin';
          await existingUser.save();
          console.log(`👑 Updated Role to Admin for: ${adminData.email}`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Admin Seeding Error: ${error.message}`);
  }
};

module.exports = seedAdmins;
