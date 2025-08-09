// MONGODB ОТКЛЮЧЕНА - используем PostgreSQL
// import mongoose from 'mongoose'
// import config from './config'

const connectDB = async (): Promise<void> => {
	// MongoDB больше не используется
	console.log('ℹ️ MongoDB отключена - используется PostgreSQL')
	return Promise.resolve()
}

export default connectDB
