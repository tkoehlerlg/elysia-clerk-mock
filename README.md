<!-- @format -->

# Elysia Clerk Mock

A lightweight utility for mocking Clerk authentication in Elysia applications built with Bun.

## Overview

This package provides a simple way to mock the Clerk authentication service for testing Elysia applications. It allows you to easily simulate different user types and authentication states without requiring a real Clerk account or external services.

## Features

-   🔑 Mock different authentication states (admin, regular user, unauthenticated)
-   🔄 Set custom user data, roles, and permissions
-   🧪 Easy integration with test frameworks
-   🚀 Support for organization context and claims
-   👤 Support for user impersonation via the actor property

## Installation

```bash
# Install the package and its peer dependencies
bun add -d elysia-clerk-mock elysia-clerk @elysiajs/eden
```

## Basic Usage

```typescript
import { clerkMocker } from "elysia-clerk-mock";
import { Elysia } from "elysia";

// Mock the clerk plugin in your tests
// For example with bun:test's mock facility:
import { mock } from "bun:test";

mock.module("elysia-clerk", () => {
	return {
		clerkPlugin: clerkMocker.plugin,
	};
});

// Configure the mock user as needed
clerkMocker.mockAdmin();

// Create your Elysia app with the mocked clerk plugin
const app = new Elysia().use(clerkMocker.plugin()).get("/", ({ auth }) => {
	return { message: `Hello, ${auth.userId}!` };
});

// Make a request
const response = await app.handle(
	new Request("http://localhost/", {
		headers: {
			Authorization: "Bearer valid-token",
		},
	})
);
const data = await response.json();
console.log(data); // { message: "Hello, user_admin!" }
```

## Testing with Treaty

Treaty is a great tool for testing Elysia apps. Here's how to use it with elysia-clerk-mock:

```typescript
import { describe, expect, it, mock } from "bun:test";
import { Elysia } from "elysia";
import { treaty } from "@elysiajs/eden";
import { clerkMocker } from "elysia-clerk-mock";

describe("API Authentication Tests", () => {
	beforeEach(() => {
		// Reset mocks before each test
		mock.restore();

		// Mock the elysia-clerk module
		mock.module("elysia-clerk", () => {
			return {
				clerkPlugin: clerkMocker.plugin,
			};
		});
	});

	it("should authenticate as admin user", async () => {
		// Set it as admin
		clerkMocker.mockAdmin();

		// Create an API that returns the auth object
		const app = new Elysia()
			.use(clerkMocker.plugin())
			.get("/", ({ auth }) => auth);

		const client = treaty(app);

		// Make a request with the mock admin auth
		const response = await client.index.get({
			headers: {
				Authorization: "Bearer valid-token",
			},
		});

		expect(response.status).toBe(200);
		expect(response.data?.userId).toBe("user_admin");
		expect(response.data?.sessionClaims?.roles).toContain("org:admin");
	});
});
```

## Available Methods

### `clerkMocker.mockAdmin(customProps?)`

Set the mock user to an admin user with predefined values and optional custom properties.

```typescript
clerkMocker.mockAdmin({
	orgSlug: "admin-org",
	orgRole: "super-admin",
	orgPermissions: ["manage:all", "read:all"],
});
```

### `clerkMocker.mockUser(customProps?)`

Set the mock user to a regular user with predefined values and optional custom properties.

```typescript
clerkMocker.mockUser({
	orgSlug: "member-org",
	orgRole: "basic-member",
	orgPermissions: ["read:own"],
});
```

### `clerkMocker.mockUnauthenticated()`

Set the mock user to an unauthenticated state.

```typescript
clerkMocker.mockUnauthenticated();
```

### `clerkMocker.setUser(userData)`

Set custom user data with full control over all properties.

```typescript
clerkMocker.setUser({
	userId: "custom_user_123",
	orgId: "custom_org_456",
	sessionClaims: {
		__raw: "",
		sub: "custom_user_123",
		iss: "https://clerk.com",
		sid: "sess_custom",
		nbf: 0,
		exp: 0,
		iat: 0,
		roles: ["custom:role1", "custom:role2"],
	},
	orgPermissions: ["custom:permission1", "custom:permission2"],
});
```

### `clerkMocker.getUser()`

Get the current mock user data.

```typescript
const currentUser = clerkMocker.getUser();
console.log(currentUser.userId);
```

### `clerkMocker.plugin(options?)`

Create an Elysia plugin that mocks Clerk authentication.

```typescript
const app = new Elysia().use(clerkMocker.plugin()).get("/", ({ auth }) => auth);
```

## Important Testing Notes

1. **Always include Authorization header with valid token**:

    ```typescript
    const response = await client.endpoint.get({
    	headers: { Authorization: "Bearer valid-token" },
    });
    ```

2. **For routes with hyphenated names, use bracket notation**:

    ```typescript
    const response = await client["user-profile"].get({
    	headers: { Authorization: "Bearer valid-token" },
    });
    ```

3. **For dynamic routes (with parameters), use treaty's param handling**:

    ```typescript
    const response = await client.items({ id: "123" }).get({
    	headers: { Authorization: "Bearer valid-token" },
    });
    ```

4. **Reset auth state between tests to avoid interference**:

    ```typescript
    beforeEach(() => {
    	clerkMocker.mockUser(); // Reset to a known state
    });
    ```

5. **Special tokens for testing error scenarios**:
    - `Bearer invalid-token` - Will return 401 unauthorized
    - `Bearer expired-token` - Will return 401 with expired token message

## License

MIT
