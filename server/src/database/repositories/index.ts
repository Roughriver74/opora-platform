export { BaseRepository } from './base/BaseRepository'
export { UserRepository } from './UserRepository'
export { FormRepository } from './FormRepository'
export { FormFieldRepository } from './FormFieldRepository'
export { SubmissionRepository } from './SubmissionRepository'

// Nomenclature repositories
export { NomenclatureRepository, nomenclatureRepository } from './NomenclatureRepository'
export { NomenclatureCategoryRepository, nomenclatureCategoryRepository } from './NomenclatureCategoryRepository'
export { NomenclatureUnitRepository, nomenclatureUnitRepository } from './NomenclatureUnitRepository'

// Создание синглтонов репозиториев
import { UserRepository } from './UserRepository'
import { FormRepository } from './FormRepository'
import { FormFieldRepository } from './FormFieldRepository'
import { SubmissionRepository } from './SubmissionRepository'
import { NomenclatureRepository } from './NomenclatureRepository'
import { NomenclatureCategoryRepository } from './NomenclatureCategoryRepository'
import { NomenclatureUnitRepository } from './NomenclatureUnitRepository'

let userRepository: UserRepository | null = null
let formRepository: FormRepository | null = null
let formFieldRepository: FormFieldRepository | null = null
let submissionRepository: SubmissionRepository | null = null
let nomenclatureRepository_singleton: NomenclatureRepository | null = null
let nomenclatureCategoryRepository_singleton: NomenclatureCategoryRepository | null = null
let nomenclatureUnitRepository_singleton: NomenclatureUnitRepository | null = null

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

export const getFormFieldRepository = (): FormFieldRepository => {
	if (!formFieldRepository) {
		formFieldRepository = new FormFieldRepository()
	}
	return formFieldRepository
}

export const getSubmissionRepository = (): SubmissionRepository => {
	if (!submissionRepository) {
		submissionRepository = new SubmissionRepository()
	}
	return submissionRepository
}

export const getNomenclatureRepository = (): NomenclatureRepository => {
	if (!nomenclatureRepository_singleton) {
		nomenclatureRepository_singleton = new NomenclatureRepository()
	}
	return nomenclatureRepository_singleton
}

export const getNomenclatureCategoryRepository = (): NomenclatureCategoryRepository => {
	if (!nomenclatureCategoryRepository_singleton) {
		nomenclatureCategoryRepository_singleton = new NomenclatureCategoryRepository()
	}
	return nomenclatureCategoryRepository_singleton
}

export const getNomenclatureUnitRepository = (): NomenclatureUnitRepository => {
	if (!nomenclatureUnitRepository_singleton) {
		nomenclatureUnitRepository_singleton = new NomenclatureUnitRepository()
	}
	return nomenclatureUnitRepository_singleton
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

	if (formFieldRepository) {
		promises.push(formFieldRepository.disconnect())
		formFieldRepository = null
	}

	if (submissionRepository) {
		promises.push(submissionRepository.disconnect())
		submissionRepository = null
	}

	if (nomenclatureRepository_singleton) {
		promises.push(nomenclatureRepository_singleton.disconnect())
		nomenclatureRepository_singleton = null
	}

	if (nomenclatureCategoryRepository_singleton) {
		promises.push(nomenclatureCategoryRepository_singleton.disconnect())
		nomenclatureCategoryRepository_singleton = null
	}

	if (nomenclatureUnitRepository_singleton) {
		promises.push(nomenclatureUnitRepository_singleton.disconnect())
		nomenclatureUnitRepository_singleton = null
	}

	await Promise.all(promises)
}