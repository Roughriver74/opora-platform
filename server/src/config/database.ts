// MONGODB ОТКЛЮЧЕНА - используем PostgreSQL
// import mongoose from 'mongoose'
// import config from './config'

const connectDB = async (): Promise<void> => {
	// MongoDB больше не используется
	return Promise.resolve()
}

export default connectDB
