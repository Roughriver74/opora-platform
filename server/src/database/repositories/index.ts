export { BaseRepository } from './base/BaseRepository'
export { UserRepository } from './UserRepository'
export { FormRepository } from './FormRepository'
export { SubmissionRepository } from './SubmissionRepository'

// Создание синглтонов репозиториев
import { UserRepository } from './UserRepository'
import { FormRepository } from './FormRepository'
import { SubmissionRepository } from './SubmissionRepository'

let userRepository: UserRepository | null = null
let formRepository: FormRepository | null = null
let submissionRepository: SubmissionRepository | null = null

export const getUserRepository = (): UserRepository => {
	if (!userRepository) {
		userRepository = new UserRepository()
	}
	return userRepository
}

export const getFormRepository = (): FormRepository => {
	if (!formRepository) {
		formRepository = new FormRepository()
	}
	return formRepository
}

export const getSubmissionRepository = (): SubmissionRepository => {
	if (!submissionRepository) {
		submissionRepository = new SubmissionRepository()
	}
	return submissionRepository
}

// Функция для закрытия всех соединений
export const closeAllRepositories = async (): Promise<void> => {
	const promises: Promise<void>[] = []
	
	if (userRepository) {
		promises.push(userRepository.disconnect())
		userRepository = null
	}
	
	if (formRepository) {
		promises.push(formRepository.disconnect())
		formRepository = null
	}
	
	if (submissionRepository) {
		promises.push(submissionRepository.disconnect())
		submissionRepository = null
	}
	
	await Promise.all(promises)
}