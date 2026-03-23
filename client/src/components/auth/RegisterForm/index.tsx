import React, { useState, useCallback } from 'react'
import { useAuth } from '../../../contexts/auth'
import Logo from '../../common/Logo'
import { SocialAuthButtons } from '../SocialAuthButtons'
import '../LoginForm/LoginForm.css'

interface RegisterFormProps {
	onSwitchToLogin: () => void
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
	const { register, isLoading, error, clearError } = useAuth()

	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [firstName, setFirstName] = useState('')
	const [lastName, setLastName] = useState('')
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

	const validate = useCallback((): boolean => {
		const errors: Record<string, string> = {}

		if (!email.trim()) {
			errors.email = 'Email обязателен'
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			errors.email = 'Неверный формат email'
		}

		if (!password) {
			errors.password = 'Пароль обязателен'
		} else if (password.length < 6) {
			errors.password = 'Минимум 6 символов'
		}

		if (password !== confirmPassword) {
			errors.confirmPassword = 'Пароли не совпадают'
		}

		setValidationErrors(errors)
		return Object.keys(errors).length === 0
	}, [email, password, confirmPassword])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!validate()) return

		await register({
			email: email.trim(),
			password,
			firstName: firstName.trim() || undefined,
			lastName: lastName.trim() || undefined,
		})
	}

	const handleFieldChange = (setter: (v: string) => void) => (value: string) => {
		setter(value)
		if (Object.keys(validationErrors).length > 0) {
			setValidationErrors({})
		}
		if (error) clearError()
	}

	const isFormValid = email.trim().length > 0 && password.length >= 6 && password === confirmPassword

	return (
		<div className='login-form-container'>
			<div className='login-form-card'>
				<div className='login-form-header'>
					<div className='login-form-logo'>
						<Logo size={60} variant='default' />
					</div>
					<h1 className='login-form-title'>Регистрация</h1>
					<p className='login-form-subtitle'>
						Создайте аккаунт для доступа к платформе
					</p>
				</div>

				<form onSubmit={handleSubmit} className='login-form'>
					<div style={{ display: 'flex', gap: '12px' }}>
						<div className='form-group' style={{ flex: 1 }}>
							<label htmlFor='firstName' className='form-label'>Имя</label>
							<input
								id='firstName'
								type='text'
								value={firstName}
								onChange={e => handleFieldChange(setFirstName)(e.target.value)}
								className='form-input'
								placeholder='Имя'
								disabled={isLoading}
								autoComplete='given-name'
							/>
						</div>
						<div className='form-group' style={{ flex: 1 }}>
							<label htmlFor='lastName' className='form-label'>Фамилия</label>
							<input
								id='lastName'
								type='text'
								value={lastName}
								onChange={e => handleFieldChange(setLastName)(e.target.value)}
								className='form-input'
								placeholder='Фамилия'
								disabled={isLoading}
								autoComplete='family-name'
							/>
						</div>
					</div>

					<div className='form-group'>
						<label htmlFor='email' className='form-label'>Email</label>
						<input
							id='email'
							type='email'
							value={email}
							onChange={e => handleFieldChange(setEmail)(e.target.value)}
							className={`form-input ${validationErrors.email ? 'form-input-error' : ''}`}
							placeholder='Введите email'
							disabled={isLoading}
							autoComplete='email'
							autoFocus
						/>
						{validationErrors.email && (
							<div className='form-error'>{validationErrors.email}</div>
						)}
					</div>

					<div className='form-group'>
						<label htmlFor='password' className='form-label'>Пароль</label>
						<input
							id='password'
							type='password'
							value={password}
							onChange={e => handleFieldChange(setPassword)(e.target.value)}
							className={`form-input ${validationErrors.password ? 'form-input-error' : ''}`}
							placeholder='Минимум 6 символов'
							disabled={isLoading}
							autoComplete='new-password'
						/>
						{validationErrors.password && (
							<div className='form-error'>{validationErrors.password}</div>
						)}
					</div>

					<div className='form-group'>
						<label htmlFor='confirmPassword' className='form-label'>Подтвердите пароль</label>
						<input
							id='confirmPassword'
							type='password'
							value={confirmPassword}
							onChange={e => handleFieldChange(setConfirmPassword)(e.target.value)}
							className={`form-input ${validationErrors.confirmPassword ? 'form-input-error' : ''}`}
							placeholder='Повторите пароль'
							disabled={isLoading}
							autoComplete='new-password'
						/>
						{validationErrors.confirmPassword && (
							<div className='form-error'>{validationErrors.confirmPassword}</div>
						)}
					</div>

					{error && (
						<div className='alert alert-error'>
							<div className='alert-content'>
								<span className='alert-icon'>!</span>
								<span className='alert-message'>{error}</span>
								<button type='button' onClick={clearError} className='alert-close' aria-label='Закрыть'>x</button>
							</div>
						</div>
					)}

					<button
						type='submit'
						disabled={!isFormValid || isLoading}
						className={`login-button ${!isFormValid || isLoading ? 'login-button-disabled' : ''}`}
					>
						{isLoading ? (
							<span className='login-button-loading'>
								<span className='spinner'></span>
								Регистрация...
							</span>
						) : (
							'Зарегистрироваться'
						)}
					</button>
				</form>

				<SocialAuthButtons />

				<div className='login-form-footer'>
					<p className='login-form-help'>
						Уже есть аккаунт?{' '}
						<button
							onClick={onSwitchToLogin}
							style={{
								background: 'none',
								border: 'none',
								color: '#4a5fcc',
								cursor: 'pointer',
								fontWeight: 600,
								fontSize: '14px',
								padding: 0,
							}}
						>
							Войти
						</button>
					</p>
				</div>
			</div>
		</div>
	)
}
