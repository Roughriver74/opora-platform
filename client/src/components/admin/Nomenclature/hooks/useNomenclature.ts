import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
	NomenclatureService,
	Nomenclature,
	NomenclatureListParams,
	CreateNomenclatureDto,
	UpdateNomenclatureDto,
	PaginatedResult,
} from '../../../../services/nomenclatureService'

const NOMENCLATURE_KEY = 'nomenclature'
const CATEGORIES_KEY = 'nomenclature-categories'
const UNITS_KEY = 'nomenclature-units'
const STATS_KEY = 'nomenclature-stats'

/**
 * Хук для работы со списком номенклатуры
 */
export const useNomenclatureList = (params?: NomenclatureListParams) => {
	return useQuery<PaginatedResult<Nomenclature>>({
		queryKey: [NOMENCLATURE_KEY, 'list', params],
		queryFn: () => NomenclatureService.getAll(params),
		staleTime: 30000, // 30 секунд
	})
}

/**
 * Хук для получения номенклатуры по ID
 */
export const useNomenclatureById = (id: string | undefined) => {
	return useQuery<Nomenclature>({
		queryKey: [NOMENCLATURE_KEY, 'detail', id],
		queryFn: () => NomenclatureService.getById(id!),
		enabled: !!id,
		staleTime: 60000, // 1 минута
	})
}

/**
 * Хук для создания номенклатуры
 */
export const useCreateNomenclature = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateNomenclatureDto) => NomenclatureService.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [NOMENCLATURE_KEY] })
			queryClient.invalidateQueries({ queryKey: [STATS_KEY] })
		},
	})
}

/**
 * Хук для обновления номенклатуры
 */
export const useUpdateNomenclature = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateNomenclatureDto }) =>
			NomenclatureService.update(id, data),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: [NOMENCLATURE_KEY] })
			queryClient.invalidateQueries({ queryKey: [NOMENCLATURE_KEY, 'detail', id] })
			queryClient.invalidateQueries({ queryKey: [STATS_KEY] })
		},
	})
}

/**
 * Хук для удаления номенклатуры
 */
export const useDeleteNomenclature = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => NomenclatureService.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [NOMENCLATURE_KEY] })
			queryClient.invalidateQueries({ queryKey: [STATS_KEY] })
		},
	})
}

/**
 * Хук для импорта из Excel
 */
export const useImportNomenclature = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (file: File) => NomenclatureService.importExcel(file),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [NOMENCLATURE_KEY] })
			queryClient.invalidateQueries({ queryKey: [STATS_KEY] })
		},
	})
}

/**
 * Хук для синхронизации с Bitrix24
 */
export const useSyncNomenclature = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () => NomenclatureService.syncFromBitrix(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [NOMENCLATURE_KEY] })
			queryClient.invalidateQueries({ queryKey: [STATS_KEY] })
		},
	})
}

/**
 * Хук для получения статистики
 */
export const useNomenclatureStats = () => {
	return useQuery({
		queryKey: [STATS_KEY],
		queryFn: () => NomenclatureService.getStats(),
		staleTime: 60000, // 1 минута
	})
}

/**
 * Хук для получения категорий
 */
export const useCategories = (tree: boolean = false) => {
	return useQuery({
		queryKey: [CATEGORIES_KEY, tree ? 'tree' : 'list'],
		queryFn: () => NomenclatureService.getCategories(tree),
		staleTime: 300000, // 5 минут
	})
}

/**
 * Хук для управления категориями
 */
export const useCategoryMutations = () => {
	const queryClient = useQueryClient()

	const createCategory = useMutation({
		mutationFn: NomenclatureService.createCategory,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] })
		},
	})

	const updateCategory = useMutation({
		mutationFn: ({ id, data }: { id: string; data: Parameters<typeof NomenclatureService.updateCategory>[1] }) =>
			NomenclatureService.updateCategory(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] })
		},
	})

	const deleteCategory = useMutation({
		mutationFn: (id: string) => NomenclatureService.deleteCategory(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] })
			queryClient.invalidateQueries({ queryKey: [NOMENCLATURE_KEY] })
		},
	})

	return { createCategory, updateCategory, deleteCategory }
}

/**
 * Хук для получения единиц измерения
 */
export const useUnits = () => {
	return useQuery({
		queryKey: [UNITS_KEY],
		queryFn: () => NomenclatureService.getUnits(),
		staleTime: 300000, // 5 минут
	})
}

/**
 * Хук для получения ошибок синхронизации
 */
export const useSyncErrors = () => {
	return useQuery({
		queryKey: [NOMENCLATURE_KEY, 'sync-errors'],
		queryFn: () => NomenclatureService.getSyncErrors(),
		staleTime: 60000, // 1 минута
	})
}
