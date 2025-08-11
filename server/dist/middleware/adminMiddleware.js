"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = void 0;
const database_config_1 = require("../database/config/database.config");
const User_entity_1 = require("../database/entities/User.entity");
const adminMiddleware = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ message: 'Not authenticated' });
        return;
    }
    try {
        const userRepository = database_config_1.AppDataSource.getRepository(User_entity_1.User);
        const user = await userRepository.findOne({ where: { id: req.user.id } });
        if (!user || user.role !== 'admin') {
            res.status(403).json({ message: 'Access denied. Admin role required.' });
            return;
        }
        next();
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.adminMiddleware = adminMiddleware;
