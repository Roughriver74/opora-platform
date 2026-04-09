import axios from 'axios'
import { api } from './api' // Импортируем настроенный экземпляр api

// CustomSection interface definition
interface CustomSection {
  id: string
  name: string
  order: number
  fields: string[]
}

// Больше не используем хардкодированный URL
// const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// Get all custom sections (globally)
export const getCustomSections = async (): Promise<CustomSection[]> => {
  try {
    // Используем api вместо axios с хардкодированным URL
    const response = await api.get('/custom-sections')

    // Map app sections to frontend CustomSection format
    const sections = response.data.sections.map((section: any) => ({
      id: section.section_id,
      name: section.name,
      order: section.order,
      fields: section.fields,
    }))
    return sections
  } catch (error) {
    console.error('Error fetching custom sections:', error)
    return []
  }
}

// For backward compatibility - this now just calls the global sections API
export const getCompanyCustomSections = async (companyId: number): Promise<CustomSection[]> => {
  console.log(`Getting sections for company ${companyId} (using global sections)`)
  return getCustomSections()
}

// Сохранение глобальных пользовательских секций
export const saveCustomSections = async (sections: any[]): Promise<boolean> => {
  try {

    // Фильтруем пустые секции и преобразуем формат данных для API
    const formattedSections = sections
      .filter(section => section && section.name && section.name.trim() !== '')
      .map(section => ({
        section_id: section.id || `section-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: section.name.trim(),
        order: section.order || 0,
        fields: Array.isArray(section.fields) ?
          section.fields.filter((field: any) => field !== null && field !== undefined) :
          []
      }))



    if (formattedSections.length === 0) {
      return true // Нет секций для сохранения - считаем успешным
    }

    return true
  } catch (error) {
    console.error('customSectionService: Ошибка сохранения глобальных секций:', error)
    // Добавляем больше информации об ошибке для отладки
    if (axios.isAxiosError(error)) {
      console.error('Детали ошибки:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      })
    }
    return false
  }
}

// For backward compatibility - this now just calls the global sections API
export const saveCompanyCustomSections = async (companyId: number, sections: CustomSection[]): Promise<boolean> => {
  console.log(`Saving sections for company ${companyId} (using global sections)`)
  return saveCustomSections(sections)
}

// Очистка всех пользовательских секций
export const clearAllCustomSections = async (): Promise<boolean> => {
  try {
    // Используем api вместо axios с хардкодированным URL
    await api.delete('/custom-sections')
    return true
  } catch (error) {
    console.error('Error clearing custom sections:', error)
    return false
  }
}

export default {
  getCustomSections,
  getCompanyCustomSections,
  saveCustomSections,
  saveCompanyCustomSections,
  clearAllCustomSections
}
