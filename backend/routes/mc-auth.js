const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validate, body } = require('../middlewares/mc-auth');
const User = require('../model/mc-user');

// POST register a new user (Public endpoint, Customer only)
router.post('/register', validate([
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').custom((value) => {
        if (value !== 'Customer') {
            throw new Error('Only Customer role is allowed for registration');
        }
        return true;
    }).withMessage('Invalid role')
]), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        console.log('Received register request:', { name, email, password, role });

        const existingUserByName = await User.findOne({ name });
        if (existingUserByName) {
            console.log('Name already taken:', name);
            return res.status(400).json({ message: 'Name already taken' });
        }

        const existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
            console.log('Email already taken:', email);
            return res.status(400).json({ message: 'Email already taken' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        console.log('Password hashed successfully');

        const user = new User({ name, email, password: hashedPassword, role });
        await user.save();
        console.log('User saved to database:', user);

        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email, role: user.role }, 
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log('JWT token generated');

        res.json({ message: 'User registered', token });
    } catch (error) {
        console.error('Error in /auth/register:', error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
});

// POST login a user (Public endpoint)
router.post('/login', validate([
    body('name').notEmpty().withMessage('Name is required'),
    body('password').notEmpty().withMessage('Password is required')
]), async (req, res) => {
    try {
        const { name, password } = req.body;
        console.log('Received login request:', { name, password });

        const user = await User.findOne({ name });
        if (!user) {
            console.log('User not found:', name);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log('Invalid password for user:', name);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email, role: user.role }, // Add email to token
            process.env.JWT_SECRET,
            { expiresIn: '10h' }
        );
        console.log('JWT token generated for login');

        res.json({ message: 'Logged in', token });
    } catch (error) {
        console.error('Error in /auth/login:', error);
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});

module.exports = router;