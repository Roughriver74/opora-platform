"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const optimizedSubmissionController_1 = require("../controllers/optimizedSubmissionController");
const router = express_1.default.Router();
// Оптимизированные маршруты для заявок
router.get('/optimized', authMiddleware_1.authMiddleware, optimizedSubmissionController_1.getOptimizedSubmissions); // Все заявки (для админов)
router.get('/optimized/my', authMiddleware_1.authMiddleware, optimizedSubmissionController_1.getOptimizedUserSubmissions); // Заявки пользователя
router.get('/optimized/stats', authMiddleware_1.authMiddleware, optimizedSubmissionController_1.getSubmissionStats); // Статистика
router.post('/optimized/update-denormalized', authMiddleware_1.authMiddleware, optimizedSubmissionController_1.updateDenormalizedData); // Обновление денормализованных данных
exports.default = router;
