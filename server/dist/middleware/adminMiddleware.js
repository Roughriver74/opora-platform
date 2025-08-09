"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = void 0;
const User_1 = __importDefault(require("../models/User"));
const adminMiddleware = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ message: 'Not authenticated' });
        return;
    }
    try {
        const user = await User_1.default.findById(req.user.id);
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
