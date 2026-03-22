export interface Organization {
	id: string
	name: string
	slug: string
	inn?: string
	createdAt?: string
	updatedAt?: string
}

export type OrganizationRole = 'org_admin' | 'manager' | 'distributor'

export interface OrganizationInfo {
	id: string
	name: string
	slug: string
	role: OrganizationRole
}

export interface OrganizationMember {
	id: string
	userId: string
	email: string
	firstName?: string
	lastName?: string
	fullName?: string
	role: OrganizationRole
	joinedAt: string
}

export interface CreateOrganizationData {
	name: string
	slug: string
	inn?: string
}

export interface AddMemberData {
	email: string
	role: OrganizationRole
}
