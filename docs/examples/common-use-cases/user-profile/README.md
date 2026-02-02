# User Profile Example

This directory contains complete user profile view and edit components for the Ear-Plug application.

## Files

- `ProfileView.tsx` - Read-only profile display component
- `ProfileEdit.tsx` - Editable profile form component

## Features

### ProfileView

- User avatar and basic information display
- Role-based content (different views for fans vs musicians)
- User stats (shows attended, RSVPs, etc.)
- Genre preferences display
- Band profile card for musicians

### ProfileEdit

- Form state management
- Real-time validation
- Genre multi-select (up to 5)
- Avatar URL preview
- Success/error feedback
- Cancel and save actions

## Usage

### View Profile

```tsx
import { ProfileView } from "@/components/profile/ProfileView";

export default function ProfilePage() {
  return (
    <div className="container mx-auto p-4">
      <ProfileView />
    </div>
  );
}
```

### Edit Profile

```tsx
import { ProfileEdit } from "@/components/profile/ProfileEdit";

export default function EditProfilePage() {
  return (
    <div className="container mx-auto p-4">
      <ProfileEdit />
    </div>
  );
}
```

## Data Flow

### ProfileView Data Flow

```
ProfileView
  |
  ├── useCurrentUser() ──> User data + role checks
  |
  ├── [If Fan]
  |   └── useUserEvents() ──> RSVPs, likes, past events
  |
  └── [If Musician]
      └── useCurrentBand() ──> Band data + stats
```

### ProfileEdit Data Flow

```
ProfileEdit
  |
  ├── useCurrentUser() ──> Initial form data
  |
  ├── [User edits form]
  |   └── useState ──> Local form state
  |
  └── [On submit]
      └── updateProfile() ──> Convex mutation
```

## Form Validation

The ProfileEdit component includes several validation patterns:

### Client-side Validation

```tsx
// Required field check
if (!name.trim()) {
  throw new Error("Name is required");
}

// Max length (enforced by input)
<input maxLength={100} ... />

// Genre limit
if (prev.length >= 5) {
  return prev; // Don't add more than 5
}
```

### Server-side Validation

The Convex `updateProfile` mutation validates:
- User is authenticated
- User exists in database
- Field types match schema

## Hooks Used

### useCurrentUser

Returns user data and helper methods:

```tsx
const {
  user,           // User document or null
  isLoading,      // Query loading state
  isFan,          // Role check helper
  isMusician,     // Role check helper
  updateProfile,  // Mutation function
} = useCurrentUser();
```

### useUserEvents

Returns user's event interactions:

```tsx
const {
  rsvps,      // Upcoming RSVP'd events
  likes,      // Liked events
  pastRsvps,  // Past attended events
  isLoading,
} = useUserEvents();
```

### useCurrentBand

Returns musician's band data:

```tsx
const {
  band,           // Basic band document
  bandWithStats,  // Band with computed stats
  isLoading,
} = useCurrentBand();
```

## Styling Notes

- Uses the Ear-Plug design system colors
- Brutalist form inputs with sharp borders
- Electric Lime accent color for selected states
- Responsive layout with max-width container
- Skeleton loaders match final layout dimensions

## Accessibility

- Form inputs have associated labels
- Required fields marked with asterisk
- Error messages linked to inputs
- Color is not the only indicator of state
- Focus states are visible

## Error Handling

### Form Errors

```tsx
try {
  await updateProfile({ ... });
  setSuccess(true);
} catch (err) {
  setError(err instanceof Error ? err.message : "Failed to update profile");
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Not authenticated" | User session expired | Redirect to sign-in |
| "User not found" | Clerk/Convex sync issue | Usually temporary |
| Network error | Connection issue | Show retry option |

## Extending

### Adding a New Profile Field

1. Add to form state:
```tsx
const [newField, setNewField] = useState("");
```

2. Add to useEffect for initial data:
```tsx
useEffect(() => {
  if (user) {
    setNewField(user.newField || "");
  }
}, [user]);
```

3. Add input to form:
```tsx
<ValidatedInput
  label="New Field"
  value={newField}
  onChange={setNewField}
/>
```

4. Include in submission:
```tsx
await updateProfile({
  // ... existing fields
  newField: newField.trim() || undefined,
});
```

5. Update Convex schema and mutation to accept the new field.
