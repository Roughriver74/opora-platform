import React from 'react'
import { useLogin } from './hooks/useLogin'
import Logo from '../../common/Logo'
import { SocialAuthButtons } from '../SocialAuthButtons'
import './LoginForm.css'

interface LoginFormProps {
	onSwitchToRegister?: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
	const {
		email,
		password,
		isLoading,
		error,
		validationErrors,
		isFormValid,
		handleEmailChange,
		handlePasswordChange,
		handleSubmit,
		clearError,
	} = useLogin()

	const handleFormSubmit = (e: React.FormEvent): void => {
		e.preventDefault()
		handleSubmit()
	}

	const handleKeyPress = (e: React.KeyboardEvent): void => {
		if (e.key === 'Enter' && isFormValid && !isLoading) {
			handleSubmit()
		}
	}

	return (
		<div className='login-form-container'>
			<div className='login-form-card'>
				<div className='login-form-header'>
					<div className='login-form-logo'>
						<Logo size={60} variant='default' />
					</div>
					<h1 className='login-form-title'>Вход в систему</h1>
					<p className='login-form-subtitle'>
						Введите пароль для доступа к системе CRM Platform
					</p>
				</div>

				<form onSubmit={handleFormSubmit} className='login-form'>
					<div className='form-group'>
						<label htmlFor='email' className='form-label'>
							Email
						</label>
						<input
							id='email'
							type='email'
							value={email}
							onChange={e => handleEmailChange(e.target.value)}
							onKeyPress={handleKeyPress}
							className={`form-input ${
								validationErrors.email ? 'form-input-error' : ''
							}`}
							placeholder='Введите email'
							disabled={isLoading}
							autoComplete='username'
							autoFocus
						/>
						{validationErrors.email && (
							<div className='form-error'>{validationErrors.email}</div>
						)}
					</div>

					<div className='form-group'>
						<label htmlFor='password' className='form-label'>
							Пароль
						</label>
						<input
							id='password'
							type='password'
							value={password}
							onChange={e => handlePasswordChange(e.target.value)}
							onKeyPress={handleKeyPress}
							className={`form-input ${
								validationErrors.password ? 'form-input-error' : ''
							}`}
							placeholder='Введите пароль'
							disabled={isLoading}
							autoComplete='current-password'
						/>
						{validationErrors.password && (
							<div className='form-error'>{validationErrors.password}</div>
						)}
					</div>

					{error && (
						<div className='alert alert-error'>
							<div className='alert-content'>
								<span className='alert-icon'>⚠️</span>
								<span className='alert-message'>{error}</span>
								<button
									type='button'
									onClick={clearError}
									className='alert-close'
									aria-label='Закрыть ошибку'
								>
									×
								</button>
							</div>
						</div>
					)}

					<button
						type='submit'
						disabled={!isFormValid || isLoading}
						className={`login-button ${
							!isFormValid || isLoading ? 'login-button-disabled' : ''
						}`}
					>
						{isLoading ? (
							<span className='login-button-loading'>
								<span className='spinner'></span>
								Вход...
							</span>
						) : (
							'Войти'
						)}
					</button>
				</form>

				<SocialAuthButtons />

				<div className='login-form-footer'>
					{onSwitchToRegister ? (
						<p className='login-form-help'>
							Нет аккаунта?{' '}
							<button
								onClick={onSwitchToRegister}
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
								Зарегистрироваться
							</button>
						</p>
					) : (
						<p className='login-form-help'>
							Если вы забыли пароль, обратитесь к системному администратору
						</p>
					)}
				</div>
			</div>
		</div>
	)
}
