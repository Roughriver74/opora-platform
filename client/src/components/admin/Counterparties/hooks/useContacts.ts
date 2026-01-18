import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ContactService, Contact, CreateContactDto, UpdateContactDto, ContactListParams, ContactStats } from '../../../../services/contactService'

const QUERY_KEYS = {
	contacts: 'contacts',
	contactStats: 'contactStats',
}

export const useContacts = (params?: ContactListParams) => {
	return useQuery({
		queryKey: [QUERY_KEYS.contacts, params],
		queryFn: () => ContactService.getAll(params),
	})
}

export const useContactStats = () => {
	return useQuery<ContactStats>({
		queryKey: [QUERY_KEYS.contactStats],
		queryFn: () => ContactService.getStats(),
	})
}

export const useCreateContact = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateContactDto) => ContactService.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.contacts] })
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.contactStats] })
		},
	})
}

export const useUpdateContact = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateContactDto }) =>
			ContactService.update(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.contacts] })
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.contactStats] })
		},
	})
}

export const useDeleteContact = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => ContactService.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.contacts] })
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.contactStats] })
		},
	})
}
