import React, { useState, useEffect } from 'react'
import {
	Box,
	Typography,
	Paper,
	Switch,
	TextField,
	FormControlLabel,
	Button,
	Alert,
	CircularProgress,
	Divider,
	Stack,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import RefreshIcon from '@mui/icons-material/Refresh'
import axios from 'axios'

interface Bitrix24Config {
	enabled: boolean
	hasWebhookUrl: boolean
	webhookUrl: string | null
}

const Bitrix24Settings: React.FC = () => {
	const [config, setConfig] = useState<Bitrix24Config | null>(null)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [testing, setTesting] = useState(false)
	const [reloading, setReloading] = useState(false)

	const [formData, setFormData] = useState({
		enabled: false,
		webhookUrl: '',
	})

	const [alerts, setAlerts] = useState<{
		success?: string
		error?: string
		warning?: string
	}>({})

	// Загрузка конфигурации при монтировании
	useEffect(() => {
		loadConfig()
	}, [])

	const loadConfig = async () => {
		try {
			setLoading(true)
			const response = await axios.get('/api/settings/bitrix24/config')

			if (response.data.success) {
				const cfg = response.data.data as Bitrix24Config
				setConfig(cfg)
				setFormData({
					enabled: cfg.enabled,
					webhookUrl: cfg.webhookUrl || '',
				})
			}
		} catch (error: any) {
			setAlerts({
				error: `Ошибка загрузки конфигурации: ${error.response?.data?.message || error.message}`,
			})
		} finally {
			setLoading(false)
		}
	}

	const handleSave = async () => {
		try {
			setSaving(true)
			setAlerts({})

			// Валидация webhook URL
			if (formData.enabled && !formData.webhookUrl.trim()) {
				setAlerts({ error: 'Webhook URL обязателен при включенной интеграции' })
				return
			}

			if (formData.webhookUrl.trim() && !formData.webhookUrl.match(/^https?:\/\/.*bitrix24\.(ru|com|net|by|kz|ua)\/rest\//)) {
				setAlerts({ error: 'Неверный формат Webhook URL. Должен содержать bitrix24 и /rest/' })
				return
			}

			// Сохраняем настройки через API
			await axios.put('/api/settings/bitrix24.enabled', {
				value: formData.enabled,
			})

			await axios.put('/api/settings/bitrix24.webhook_url', {
				value: formData.webhookUrl.trim(),
			})

			setAlerts({
				success: 'Настройки сохранены успешно',
				warning: 'Для применения изменений нажмите "Перезагрузить интеграцию"',
			})

			// Обновляем конфигурацию
			await loadConfig()
		} catch (error: any) {
			setAlerts({
				error: `Ошибка сохранения: ${error.response?.data?.message || error.message}`,
			})
		} finally {
			setSaving(false)
		}
	}

	const handleTestConnection = async () => {
		try {
			setTesting(true)
			setAlerts({})

			const response = await axios.post('/api/settings/bitrix24/test-connection')

			if (response.data.success) {
				setAlerts({
					success: `✅ ${response.data.message}. Найдено полей: ${response.data.data.fieldsCount}`,
				})
			}
		} catch (error: any) {
			setAlerts({
				error: `❌ ${error.response?.data?.message || error.message}`,
			})
		} finally {
			setTesting(false)
		}
	}

	const handleReload = async () => {
		try {
			setReloading(true)
			setAlerts({})

			const response = await axios.post('/api/settings/bitrix24/reload')

			if (response.data.success) {
				setAlerts({
					success: `✅ ${response.data.message}`,
				})
				await loadConfig()
			}
		} catch (error: any) {
			setAlerts({
				error: `❌ ${error.response?.data?.message || error.message}`,
			})
		} finally {
			setReloading(false)
		}
	}

	if (loading) {
		return (
			<Box display="flex" justifyContent="center" p={4}>
				<CircularProgress />
			</Box>
		)
	}

	return (
		<Paper sx={{ p: 3 }}>
			<Typography variant="h5" gutterBottom>
				Интеграция с Bitrix24
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
				Настройка подключения к Bitrix24 CRM для синхронизации сделок и контактов
			</Typography>

			<Divider sx={{ mb: 3 }} />

			{/* Алерты */}
			{alerts.success && (
				<Alert severity="success" sx={{ mb: 2 }} onClose={() => setAlerts({ ...alerts, success: undefined })}>
					{alerts.success}
				</Alert>
			)}
			{alerts.error && (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setAlerts({ ...alerts, error: undefined })}>
					{alerts.error}
				</Alert>
			)}
			{alerts.warning && (
				<Alert severity="warning" sx={{ mb: 2 }} onClose={() => setAlerts({ ...alerts, warning: undefined })}>
					{alerts.warning}
				</Alert>
			)}

			{/* Статус интеграции */}
			<Box sx={{ mb: 3, p: 2, bgcolor: config?.enabled ? 'success.50' : 'grey.100', borderRadius: 1 }}>
				<Stack direction="row" alignItems="center" spacing={1}>
					{config?.enabled ? (
						<CheckCircleIcon color="success" />
					) : (
						<ErrorIcon color="disabled" />
					)}
					<Typography variant="body1" fontWeight="bold">
						Статус: {config?.enabled ? 'Интеграция включена' : 'Интеграция отключена'}
					</Typography>
				</Stack>
			</Box>

			{/* Форма */}
			<Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
				{/* Включить интеграцию */}
				<FormControlLabel
					control={
						<Switch
							checked={formData.enabled}
							onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
						/>
					}
					label="Включить интеграцию с Bitrix24"
				/>

				{/* Webhook URL */}
				<TextField
					fullWidth
					label="Webhook URL"
					placeholder="https://your-domain.bitrix24.ru/rest/user/token/"
					value={formData.webhookUrl}
					onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
					disabled={!formData.enabled}
					helperText={
						formData.enabled
							? 'Получите webhook URL в Bitrix24: Настройки → Разработчикам → Входящие вебхуки'
							: 'Включите интеграцию для настройки webhook URL'
					}
					type={formData.webhookUrl && formData.webhookUrl.includes('***') ? 'text' : 'url'}
				/>

				<Divider />

				{/* Кнопки действий */}
				<Stack direction="row" spacing={2}>
					<Button
						variant="contained"
						color="primary"
						onClick={handleSave}
						disabled={saving || !formData.enabled && !formData.webhookUrl}
					>
						{saving ? <CircularProgress size={24} /> : 'Сохранить'}
					</Button>

					<Button
						variant="outlined"
						onClick={handleTestConnection}
						disabled={!formData.enabled || !formData.webhookUrl || testing}
					>
						{testing ? <CircularProgress size={24} /> : 'Тестировать подключение'}
					</Button>

					<Button
						variant="outlined"
						color="secondary"
						startIcon={<RefreshIcon />}
						onClick={handleReload}
						disabled={reloading}
					>
						{reloading ? <CircularProgress size={24} /> : 'Перезагрузить интеграцию'}
					</Button>
				</Stack>
			</Box>

			<Divider sx={{ my: 3 }} />

			{/* Информация */}
			<Alert severity="info">
				<Typography variant="body2">
					<strong>Приоритет настроек:</strong> База данных → .env файл
					<br />
					После сохранения настройки в БД будут иметь приоритет над значениями в .env
					<br />
					<br />
					<strong>Безопасность:</strong> Webhook URL автоматически шифруется при сохранении
				</Typography>
			</Alert>
		</Paper>
	)
}

export default Bitrix24Settings
