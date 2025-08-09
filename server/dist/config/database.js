"use strict";
// MONGODB ОТКЛЮЧЕНА - используем PostgreSQL
// import mongoose from 'mongoose'
// import config from './config'
Object.defineProperty(exports, "__esModule", { value: true });
const connectDB = async () => {
    // MongoDB больше не используется
    console.log('ℹ️ MongoDB отключена - используется PostgreSQL');
    return Promise.resolve();
};
exports.default = connectDB;
