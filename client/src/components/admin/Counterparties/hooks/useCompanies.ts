import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CompanyService, Company, CreateCompanyDto, UpdateCompanyDto, CompanyListParams, CompanyStats } from '../../../../services/companyService'

const QUERY_KEYS = {
	companies: 'companies',
	companyStats: 'companyStats',
}

export const useCompanies = (params?: CompanyListParams) => {
	return useQuery({
		queryKey: [QUERY_KEYS.companies, params],
		queryFn: () => CompanyService.getAll(params),
	})
}

export const useCompanyStats = () => {
	return useQuery<CompanyStats>({
		queryKey: [QUERY_KEYS.companyStats],
		queryFn: () => CompanyService.getStats(),
	})
}

export const useCreateCompany = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateCompanyDto) => CompanyService.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.companies] })
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.companyStats] })
		},
	})
}

export const useUpdateCompany = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateCompanyDto }) =>
			CompanyService.update(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.companies] })
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.companyStats] })
		},
	})
}

export const useDeleteCompany = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => CompanyService.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.companies] })
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.companyStats] })
		},
	})
}

export const useImportCompanies = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (file: File) => CompanyService.importExcel(file),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.companies] })
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.companyStats] })
		},
	})
}
