const express = require('express');
const router = express.Router();
const { auth, validate, body, param } = require('../middlewares/mc-auth');
const User = require('../model/mc-user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// GET all users (Admin only)
router.get('/', auth(['Customer', 'Admin']), async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
});

// GET all customers 
router.get('/customers', auth(['Customer', 'Admin']), async (req, res) => {
    try {
        const customers = await User.find({ role: 'Customer' });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching customers', error });
    }
});

// GET a specific user by ID
router.get('/:id', auth(['Customer', 'Admin']), validate([
    param('id').isMongoId().withMessage('Invalid user ID')
]), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user', error });
    }
});

// POST a new user (Admin only)
router.post('/', auth(['Admin']), validate([
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please enter a valid email'), // Added email validation
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['Admin', 'Customer']).withMessage('Invalid role')
]), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({ name, email, password: hashedPassword, role });
        await user.save();
        res.json({ message: 'User created', user });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error });
    }
});

// PUT  a user (Admin only)
router.put('/:id', auth(['Admin']), validate([
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('name').optional().notEmpty(),
    body('email').optional().isEmail().withMessage('Please enter a valid email'), // Added email validation
    body('password').optional().isLength({ min: 6 }),
    body('role').optional().isIn(['Admin', 'Customer'])
]), async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { name, email, password, role } = req.body;
        if (name) user.name = name;
        if (email) user.email = email; // Added email update
        if (password) user.password = await bcrypt.hash(password, 12);
        if (role) user.role = role;
        await user.save();
        res.json({ message: 'User updated', user });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error });
    }
});

// DELETE a user (Admin only)
router.delete('/:id', auth(['Customer', 'Admin']), validate([param('id').isMongoId().withMessage('Invalid user ID')]), async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error });
    }
});

module.exports = router;