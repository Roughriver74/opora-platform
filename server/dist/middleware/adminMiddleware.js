"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = void 0;
const adminMiddleware = (req, res, next) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ message: 'Не авторизован' });
        return;
    }
    if (user.role !== 'admin') {
        res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора' });
        return;
    }
    next();
};
exports.adminMiddleware = adminMiddleware;
