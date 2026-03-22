import React from 'react'
import { Container, Box, CssBaseline } from '@mui/material'
import Navbar from './Navbar'

// TODO: Hook up org branding via context once OrganizationContext is wired globally.
// Pattern for consumption:
//
//   const { currentOrganization } = useAuth()  // currentOrganization includes subscriptionPlan and settings.branding
//   const isPro = currentOrganization?.subscriptionPlan === 'pro'
//   const branding = isPro ? currentOrganization?.settings?.branding : undefined
//
//   footerBg    = branding?.primaryColor   ?? '#1B4965'
//   companyName = branding?.companyName    ?? 'ОПОРА'
//
//   For favicon:
//     if (branding?.faviconUrl) {
//       const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement
//       if (link) link.href = branding.faviconUrl
//     }

// Default branding constants (used when no Pro-plan org branding is configured)
const DEFAULT_PRIMARY_COLOR = '#1B4965'
const DEFAULT_COMPANY_NAME = 'ОПОРА'

interface LayoutProps {
	children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
	// Branding values — replace these with org branding once context is available (see TODO above)
	const footerBg = DEFAULT_PRIMARY_COLOR
	const companyName = DEFAULT_COMPANY_NAME

	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				minHeight: '100vh',
				bgcolor: '#f8fafc',
			}}
		>
			<CssBaseline />
			<Navbar />

			{/* Основной контент без ограничений по ширине для больших форм */}
			<Box component='main' sx={{ flexGrow: 1, py: 0 }}>
				{children}
			</Box>

			{/* Компактный футер */}
			<Box
				component='footer'
				sx={{
					py: 2,
					px: 2,
					mt: 'auto',
					backgroundColor: footerBg,
					color: 'white',
					textAlign: 'center',
				}}
			>
				<Container maxWidth='lg'>
					© {new Date().getFullYear()} {companyName}. Все права защищены. Create
					by shknv.
				</Container>
			</Box>
		</Box>
	)
}

export default Layout
