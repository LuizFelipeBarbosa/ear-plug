# Users API

This document details all user-related queries and mutations in the Ear-Plug backend.

**Module:** `/convex/users.ts`

---

## Table of Contents

1. [Queries](#queries)
   - [getCurrentUser](#getcurrentuser)
   - [getById](#getbyid)
   - [getByClerkId](#getbyclerkid)
2. [Mutations](#mutations)
   - [upsertUser](#upsertuser)
   - [updateRole](#updaterole)
   - [updateProfile](#updateprofile)
   - [incrementShowsAttended](#incrementshowsattended)
3. [Internal Mutations](#internal-mutations)
   - [createUserFromClerk](#createuserfromclerk)
4. [Type Definitions](#type-definitions)

---

## Queries

### getCurrentUser

Get the currently authenticated user.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns `null` if unauthenticated) |
| **Arguments** | None |
| **Returns** | `User \| null` |

#### Response Schema

```typescript
{
  _id: Id<"users">;
  _creationTime: number;
  clerkId: string;
  role: "fan" | "musician";
  name: string;
  email: string;
  location?: string;
  avatar?: string;
  topGenres?: Genre[];
  memberSince: number;
  showsAttended?: number;
}
```

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function ProfilePage() {
  const user = useQuery(api.users.getCurrentUser);

  if (user === undefined) {
    return <LoadingSpinner />;
  }

  if (user === null) {
    return <SignInPrompt />;
  }

  return (
    <div>
      <h1>{user.name}</h1>
      <p>Role: {user.role}</p>
      <p>Member since: {new Date(user.memberSince).toLocaleDateString()}</p>
    </div>
  );
}
```

#### Hook Wrapper

```typescript
import { useCurrentUser } from "@/hooks";

function Component() {
  const { user, isLoading, isFan, isMusician } = useCurrentUser();
}
```

---

### getById

Get a user by their Convex document ID.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ userId: Id<"users"> }` |
| **Returns** | `User \| null` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `userId` | `Id<"users">` | Yes | Convex document ID of the user |

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function UserProfile({ userId }: { userId: Id<"users"> }) {
  const user = useQuery(api.users.getById, { userId });

  if (!user) return <NotFound />;

  return <h1>{user.name}</h1>;
}
```

---

### getByClerkId

Get a user by their Clerk ID.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ clerkId: string }` |
| **Returns** | `User \| null` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `clerkId` | `string` | Yes | The user's Clerk ID |

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

// Useful when you have a Clerk ID from a webhook or external source
const user = useQuery(api.users.getByClerkId, {
  clerkId: "user_abc123...",
});
```

---

## Mutations

### upsertUser

Create a new user or update an existing user. Called automatically on sign-in.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | No |
| **Arguments** | See below |
| **Returns** | `Id<"users">` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `clerkId` | `string` | Yes | The user's Clerk ID |
| `email` | `string` | Yes | The user's email address |
| `name` | `string` | Yes | The user's display name |
| `avatar` | `string` | No | URL to the user's avatar image |

#### Behavior

- **If user exists:** Updates `email`, `name`, and `avatar` fields
- **If user doesn't exist:** Creates new user with:
  - Default role: `"fan"`
  - `memberSince`: Current timestamp
  - `showsAttended`: 0

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useUser } from "@clerk/nextjs";

function AppLayout({ children }) {
  const { user: clerkUser } = useUser();
  const upsertUser = useMutation(api.users.upsertUser);

  useEffect(() => {
    if (clerkUser) {
      upsertUser({
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        name: clerkUser.fullName || "User",
        avatar: clerkUser.imageUrl,
      });
    }
  }, [clerkUser]);

  return children;
}
```

---

### updateRole

Update the current user's role during onboarding.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ role: "fan" \| "musician" }` |
| **Returns** | `Id<"users">` |
| **Throws** | `"Not authenticated"`, `"User not found"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `role` | `"fan" \| "musician"` | Yes | The role to assign to the user |

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function RoleSelection() {
  const updateRole = useMutation(api.users.updateRole);

  const handleSelectRole = async (role: "fan" | "musician") => {
    try {
      await updateRole({ role });
      // Navigate to appropriate dashboard
    } catch (error) {
      console.error("Failed to update role:", error.message);
    }
  };

  return (
    <div>
      <button onClick={() => handleSelectRole("fan")}>
        I'm a Music Fan
      </button>
      <button onClick={() => handleSelectRole("musician")}>
        I'm a Musician
      </button>
    </div>
  );
}
```

#### Hook Wrapper

```typescript
import { useCurrentUser } from "@/hooks";

function Component() {
  const { setRole } = useCurrentUser();

  await setRole("musician");
}
```

---

### updateProfile

Update the current user's profile information.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | See below |
| **Returns** | `Id<"users">` |
| **Throws** | `"Not authenticated"`, `"User not found"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | No | Updated display name |
| `location` | `string` | No | User's location (e.g., "San Francisco, CA") |
| `avatar` | `string` | No | URL to new avatar image |
| `topGenres` | `Genre[]` | No | User's favorite genres (max 5) |

#### Genre Options

```typescript
type Genre = "indie" | "rock" | "jazz" | "electronic" | "folk" | "pop" | "alternative";
```

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function EditProfileForm() {
  const updateProfile = useMutation(api.users.updateProfile);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [genres, setGenres] = useState<Genre[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        name: name || undefined,
        location: location || undefined,
        topGenres: genres.length > 0 ? genres : undefined,
      });
      // Show success message
    } catch (error) {
      console.error("Failed to update profile:", error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Display name"
      />
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location"
      />
      {/* Genre selection UI */}
      <button type="submit">Save Changes</button>
    </form>
  );
}
```

---

### incrementShowsAttended

Increment the user's shows attended count. Called when a user attends an event.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | None |
| **Returns** | `void` |
| **Throws** | `"Not authenticated"`, `"User not found"` |

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function EventCheckIn({ eventId }) {
  const incrementShows = useMutation(api.users.incrementShowsAttended);

  const handleCheckIn = async () => {
    await incrementShows();
    // Show confirmation
  };

  return <button onClick={handleCheckIn}>Check In to Event</button>;
}
```

---

## Internal Mutations

### createUserFromClerk

**Internal mutation** - Called by the Clerk webhook handler to create users.

| Property | Value |
|----------|-------|
| **Type** | Internal Mutation |
| **Arguments** | `{ clerkId: string, email: string, name: string, avatar?: string }` |
| **Returns** | `Id<"users">` |

#### Behavior

- Checks if user with `clerkId` already exists
- If exists: Returns existing user's ID (no update)
- If not exists: Creates new user with default role `"fan"`

#### Note

This mutation can only be called internally by other Convex functions (like the HTTP webhook handler). It cannot be called directly from client code.

---

## Type Definitions

### User

```typescript
interface User {
  _id: Id<"users">;
  _creationTime: number;
  clerkId: string;
  role: "fan" | "musician";
  name: string;
  email: string;
  location?: string;
  avatar?: string;
  topGenres?: Genre[];
  memberSince: number;
  showsAttended?: number;
}
```

### Genre

```typescript
type Genre =
  | "indie"
  | "rock"
  | "jazz"
  | "electronic"
  | "folk"
  | "pop"
  | "alternative";
```

### UserRole

```typescript
type UserRole = "fan" | "musician";
```

---

## Database Schema

### Table: `users`

| Field | Type | Description |
|-------|------|-------------|
| `clerkId` | `string` | Clerk user ID (unique) |
| `role` | `"fan" \| "musician"` | User's account type |
| `name` | `string` | Display name |
| `email` | `string` | Email address |
| `location` | `string?` | User's location |
| `avatar` | `string?` | Avatar URL |
| `topGenres` | `Genre[]?` | Favorite genres |
| `memberSince` | `number` | Account creation timestamp |
| `showsAttended` | `number?` | Count of attended shows |

### Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| `by_clerk_id` | `clerkId` | Look up users by Clerk ID |
| `by_email` | `email` | Look up users by email |
| `by_role` | `role` | Filter users by role |

---

## Related Documentation

- [Authentication](../authentication.md) - How auth works with Clerk
- [Webhooks](../webhooks.md) - Clerk webhook for user sync
- [Bands API](./bands.md) - Band management for musicians
