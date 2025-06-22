"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const backupController_1 = require("../controllers/backupController");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const router = express_1.default.Router();
// Все роуты защищены, только для админов
router.use(adminMiddleware_1.adminMiddleware);
router.get('/', backupController_1.listBackups);
router.post('/create', backupController_1.createBackup);
router.post('/restore/:timestamp', backupController_1.restoreBackup);
router.delete('/:timestamp', backupController_1.deleteBackup);
exports.default = router;
