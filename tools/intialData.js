const User = require('../models/user');
let i = 0;

async function createInitialUsers() {
    console.log("Starting initial users creation");
    try {
        const password = 'Hamza;2020';
        const defaultImage = '/uploads/users/default.png'; // Default image path

        // Admin user
        const adminUser = {
            nom: 'Belja',
            prenom: 'Ons',
            email: 'ons.belja@gmail.com',
            mot_de_passe: password,
            telephone: '20000000',
            role: 'ADMIN',
            sex: 'FEMME',
            status: 'ACTIF',
            image: defaultImage  // Add default image
        };

        // Generate 9 random users
        const randomUsers = Array.from({ length: 9 }, (_, i) => generateRandomUser(i, password, defaultImage));

        const usersToCreate = [adminUser, ...randomUsers];

        for (const userData of usersToCreate) {
            console.log(`Processing user ${++i}: ${userData.email}`);
            const existingUser = await User.findOne({ email: userData.email });
            if (!existingUser) {
                const user = new User({
                    ...userData,
                    mot_de_passe: password,
                    status: 'ACTIF',
                    image: defaultImage  // Ensure image is set
                });

                await user.save();
                console.log(`Created user: ${userData.email}`);
            } else {
                console.log(`User already exists: ${userData.email}`);
            }
        }
        console.log('Initial users setup completed');
    } catch (error) {
        console.error('Error creating initial users:', error);
    }
}

function generateRandomUser(index, password, defaultImage) {
    const firstNames = ['John', 'Jane', 'Alice', 'Bob', 'Charlie', 'Diana', 'Ethan', 'Fiona', 'George'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez'];
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];

    return {
        nom: lastNames[index],
        prenom: firstNames[index],
        email: `user${index}@${domains[index % domains.length]}`,
        mot_de_passe: password,
        telephone: `2${Math.floor(10000000 + Math.random() * 90000000)}`.slice(0, 8),
        role: 'CONDUCTEUR',
        sex: index % 2 === 0 ? 'HOMME' : 'FEMME',
        image: defaultImage  // Add default image to random users
    };
}

module.exports = createInitialUsers;
