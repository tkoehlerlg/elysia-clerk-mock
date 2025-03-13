/** @format */

import type { ElysiaClerkOptions } from "elysia-clerk";
import { Elysia } from "elysia";
import type { AuthObject } from "@clerk/backend";

// Create our own AuthStatus enum to avoid internal import
enum AuthStatus {
	SignedIn = "signed_in",
	SignedOut = "signed_out",
}

// Create our own type definition without using internal imports
// Use a type alias with a simple structure that matches our needs
type SignedInAuthObject = {
	sessionClaims: {
		__raw: string;
		sub: string;
		iss: string;
		sid: string;
		nbf: number;
		exp: number;
		iat: number;
		roles?: string[];
	};
	sessionId: string;
	actor: any | undefined;
	userId: string;
	orgId: string | undefined;
	orgRole: string | undefined;
	orgSlug: string | undefined;
	orgPermissions: string[] | undefined;
	factorVerificationAge: [firstFactorAge: number, secondFactorAge: number] | null;
	getToken: () => Promise<string>;
	has: (permission: string) => boolean;
	debug: () => Record<string, any>;
};

const DEFAULT_AUTH_OBJECT: AuthObject = {
	userId: "user_default",
	orgId: "org_default",
	sessionClaims: {
		__raw: "",
		sub: "user_default",
		iss: "https://clerk.com",
		sid: "sess_default",
		nbf: 0,
		exp: 0,
		iat: 0,
	},
	sessionId: "sess_default",
	actor: undefined,
	orgRole: "org:member",
	orgSlug: undefined,
	orgPermissions: undefined,
	factorVerificationAge: null,
	getToken: async () => "",
	has: () => false,
	debug: () => ({}),
};

/**
 * Class that handles Clerk authentication mocking
 */
class ElysiaClerkMock {
	private authObject: AuthObject;
	private defaultAuthObject: AuthObject;

	constructor(initialUser?: Partial<SignedInAuthObject>) {
		// Default user values
		this.authObject = {
			...DEFAULT_AUTH_OBJECT,
			...initialUser,
		} as AuthObject;
		this.defaultAuthObject = { ...this.authObject };
	}

	/**
	 * Set the mock user to an admin user
	 */
	mockAdmin(customProps: Partial<SignedInAuthObject> = {}) {
		this.setUser({
			userId: "user_admin",
			orgId: "org_admin",
			orgRole: "org:admin",
			sessionClaims: {
				__raw: "",
				sub: "user_admin",
				iss: "https://clerk.com",
				sid: "sess_admin",
				nbf: 0,
				exp: 0,
				iat: 0,
				roles: ["org:admin"],
			},
			...customProps,
		});
		return { ...this.authObject };
	}

	/**
	 * Set the mock user to a regular user
	 */
	mockUser(customProps: Partial<SignedInAuthObject> = {}) {
		this.setUser({
			userId: "user_regular",
			orgId: "org_regular",
			orgRole: "org:member",
			sessionClaims: {
				__raw: "",
				sub: "user_regular",
				iss: "https://clerk.com",
				sid: "sess_user",
				nbf: 0,
				exp: 0,
				iat: 0,
				roles: ["org:member"],
			},
			...customProps,
		});
		return { ...this.authObject };
	}

	/**
	 * Set the mock user to an unauthenticated state
	 */
	mockUnauthenticated() {
		this.authObject = {
			userId: null,
			orgId: null,
			sessionClaims: null,
			sessionId: null,
			actor: null,
			orgRole: null,
			orgSlug: null,
			orgPermissions: null,
			factorVerificationAge: null,
			getToken: async () => "",
			has: () => false,
			debug: () => ({}),
		};
		return { ...this.authObject };
	}

	/**
	 * Set custom user data
	 */
	setUser(userData: Partial<SignedInAuthObject>) {
		// Use type assertion to handle the complex type requirements
		this.authObject = {
			...this.authObject,
			...userData,
		} as AuthObject;
		return { ...this.authObject };
	}

	/**
	 * Get the current mock user data
	 */
	getUser(): AuthObject {
		return { ...this.authObject };
	}

	/**
	 * Reset the mock user to the default state
	 */
	reset() {
		this.authObject = { ...this.defaultAuthObject };
	}

	/**
	 * Create a mock Clerk client
	 */
	private get mockClerkClient() {
		return {
			authenticateRequest: (_request: Request) => ({
				toAuth: () => ({
					userId: this.authObject.userId,
					orgId: this.authObject.orgId,
					isAuthenticated: this.authObject.userId !== null,
				}),
				headers: new Headers(),
				status: this.authObject.userId !== null ? AuthStatus.SignedIn : AuthStatus.SignedOut,
			}),
		};
	}

	/**
	 * Create the Elysia plugin that mocks Clerk authentication
	 */
	plugin = (options?: ElysiaClerkOptions) => {
		return new Elysia({
			name: "elysia-clerk",
			seed: options,
		})
			.decorate("clerk", this.mockClerkClient)
			.resolve(async ({ request, error }) => {
				const authorization = request.headers.get("Authorization");
				if (!authorization || !authorization.startsWith("Bearer ")) {
					return error(401, "Unauthorized - No token provided");
				}

				if (authorization === "Bearer invalid-token") {
					return error(401, "Unauthorized - Invalid token");
				}

				if (authorization === "Bearer expired-token") {
					return error(401, "Unauthorized - Expired token");
				}

				return {
					auth: this.authObject,
				};
			})
			.as("plugin");
	};
}

const clerkMock = new ElysiaClerkMock();

export { ElysiaClerkMock, clerkMock };
