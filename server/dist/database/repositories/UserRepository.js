"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const BaseRepository_1 = require("./base/BaseRepository");
const User_entity_1 = require("../entities/User.entity");
class UserRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(User_entity_1.User, 'user');
    }
    async findByEmail(email) {
        const user = await this.repository.findOne({
            where: { email: email.toLowerCase() },
            select: ['id', 'email', 'password', 'firstName', 'lastName', 'phone', 'bitrixUserId', 'status', 'role', 'isActive', 'settings', 'lastLogin', 'createdAt', 'updatedAt']
        });
        return user;
    }
    async findByBitrixUserId(bitrixUserId) {
        return this.repository.findOne({
            where: { bitrixUserId },
        });
    }
    async findActiveUsers(options) {
        return this.repository.find({
            where: { isActive: true, status: User_entity_1.UserStatus.ACTIVE },
            ...options,
        });
    }
    async findAdmins() {
        return this.repository.find({
            where: { role: User_entity_1.UserRole.ADMIN, isActive: true },
            order: { createdAt: 'DESC' },
        });
    }
    async findByRole(role, options) {
        return this.repository.find({
            where: { role },
            ...options,
        });
    }
    async updateLastLogin(userId) {
        await this.repository.update(userId, {
            lastLogin: new Date(),
        });
        await this.invalidateCache(userId);
    }
    async updateSettings(userId, settings) {
        const user = await this.findById(userId);
        if (!user)
            return null;
        user.settings = { ...user.settings, ...settings };
        const saved = await this.repository.save(user);
        await this.invalidateCache(userId);
        return saved;
    }
    async deactivateUser(userId) {
        const result = await this.repository.update(userId, {
            isActive: false,
            status: User_entity_1.UserStatus.INACTIVE,
        });
        await this.invalidateCache(userId);
        return result.affected ? result.affected > 0 : false;
    }
    async activateUser(userId) {
        const result = await this.repository.update(userId, {
            isActive: true,
            status: User_entity_1.UserStatus.ACTIVE,
        });
        await this.invalidateCache(userId);
        return result.affected ? result.affected > 0 : false;
    }
    async changePassword(userId, newPassword) {
        const user = await this.findById(userId);
        if (!user)
            return false;
        user.password = newPassword; // Хеширование происходит в @BeforeUpdate
        await this.repository.save(user);
        await this.invalidateCache(userId);
        return true;
    }
    async searchUsers(query) {
        const queryBuilder = this.createQueryBuilder('user');
        return queryBuilder
            .where('LOWER(user.email) LIKE LOWER(:query) OR ' +
            'LOWER(user.firstName) LIKE LOWER(:query) OR ' +
            'LOWER(user.lastName) LIKE LOWER(:query)', { query: `%${query}%` })
            .andWhere('user.isActive = :isActive', { isActive: true })
            .orderBy('user.createdAt', 'DESC')
            .limit(20)
            .getMany();
    }
    async getUsersWithSubmissions() {
        return this.createQueryBuilder('user')
            .leftJoinAndSelect('user.submissions', 'submission')
            .where('user.isActive = :isActive', { isActive: true })
            .orderBy('user.createdAt', 'DESC')
            .getMany();
    }
    async getAssignableUsers() {
        return this.repository.find({
            where: [
                { role: User_entity_1.UserRole.ADMIN, isActive: true },
                { role: User_entity_1.UserRole.USER, isActive: true, settings: { onlyMyCompanies: false } },
            ],
            order: { firstName: 'ASC', lastName: 'ASC' },
        });
    }
    async getUserStatistics(userId) {
        const user = await this.createQueryBuilder('user')
            .leftJoin('user.submissions', 'submission')
            .leftJoin('user.assignedSubmissions', 'assigned')
            .where('user.id = :userId', { userId })
            .select('user.id', 'id')
            .addSelect('user.createdAt', 'createdAt')
            .addSelect('user.lastLogin', 'lastLogin')
            .addSelect('COUNT(DISTINCT submission.id)', 'totalSubmissions')
            .addSelect('COUNT(DISTINCT assigned.id)', 'assignedSubmissions')
            .groupBy('user.id')
            .getRawOne();
        if (!user) {
            return {
                totalSubmissions: 0,
                assignedSubmissions: 0,
                lastLoginDays: null,
                accountAgeDays: 0,
            };
        }
        const now = new Date();
        const createdAt = new Date(user.createdAt);
        const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
        return {
            totalSubmissions: parseInt(user.totalSubmissions) || 0,
            assignedSubmissions: parseInt(user.assignedSubmissions) || 0,
            lastLoginDays: lastLogin
                ? Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
                : null,
            accountAgeDays: Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        };
    }
    async findWithPaginationAndFilters(page = 1, limit = 20, filters = {}) {
        const queryBuilder = this.createQueryBuilder('user');
        // Применяем фильтры
        if (filters.search) {
            queryBuilder.where('LOWER(user.email) LIKE LOWER(:search) OR ' +
                'LOWER(user.firstName) LIKE LOWER(:search) OR ' +
                'LOWER(user.lastName) LIKE LOWER(:search)', { search: `%${filters.search}%` });
        }
        if (filters.role) {
            if (filters.search) {
                queryBuilder.andWhere('user.role = :role', { role: filters.role });
            }
            else {
                queryBuilder.where('user.role = :role', { role: filters.role });
            }
        }
        if (filters.status) {
            const condition = 'user.status = :status';
            if (filters.search || filters.role) {
                queryBuilder.andWhere(condition, { status: filters.status });
            }
            else {
                queryBuilder.where(condition, { status: filters.status });
            }
        }
        // Исключаем поле password из выборки
        queryBuilder.select([
            'user.id',
            'user.email',
            'user.firstName',
            'user.lastName',
            'user.phone',
            'user.bitrixUserId',
            'user.status',
            'user.role',
            'user.isActive',
            'user.settings',
            'user.lastLogin',
            'user.createdAt',
            'user.updatedAt',
        ]);
        // Сортировка по дате создания (новые первыми)
        queryBuilder.orderBy('user.createdAt', 'DESC');
        // Пагинация
        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);
        // Получаем данные и общее количество
        const [data, total] = await queryBuilder.getManyAndCount();
        return {
            data,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        };
    }
}
exports.UserRepository = UserRepository;
