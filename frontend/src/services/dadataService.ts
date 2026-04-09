import { api } from './api'

const DADATA_TOKEN = '65cdeacdb9dd2d9f9d41634917be41aced8be39c' //import.meta.env.VITE_DADATA_API_KEY; // или process.env

interface Suggestion {
	value: string
	data: {
		country: string | null
		city: string | null
		street: string | null
		house: string | null
		postal_code: string | null
		geo_lat: string | null
		geo_lon: string | null
		company?: {
			id: string
		}
	}
}

export const suggestAddress = async (query: string): Promise<Suggestion[]> => {
	const response = await fetch(
		'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Token ${DADATA_TOKEN}`,
			},
			body: JSON.stringify({ query }),
		}
	)

	if (!response.ok) throw new Error('Ошибка при получении подсказок')

	const data = await response.json()
	return data.suggestions
}

export const validateAddress = async (address: string | undefined | null) => {
	try {

		if (!address) {
			return {
				success: false,
				error: 'Адрес не может быть пустым',
			}
		}

		const response = await api.post('/dadata/check-exist-address', {
			query: address.toString(),
		})
		return { success: true, data: response.data }
	} catch (error) {
		console.error('Ошибка валидации адреса:', error)

		return {
			success: false,
			error: 'Неверный или несуществующий адрес',
		}
	}
}
