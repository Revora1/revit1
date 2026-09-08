# RevItUp Security Specification

## 1. Data Invariants
- A `Post` must have a valid `videoUrl` and `authorId`.
- A `Car` must have a valid `make`, `model`, and `year`.
- A `Like` must reference a valid `postId` and be unique per user/post.
- A `Follow` must have distinct `followerId` and `followingId`.

## 2. Dirty Dozen Payloads (Rejection Criteria)
1. Set `authorId` to another user's UID on create.
2. Update `likesCount` on a post directly from the client without a corresponding `Like` document (wait, client *can* increment, but rules should restrict).
3. Inject a 1MB string into a `Car`'s `make`.
4. Delete another user's `Car`.
5. Create a `Post` with a future `createdAt`.
6. Update the `ownerId` of an existing `Car`.
7. Create a `Follow` where `followerId` == `followingId`.
8. List all users' profiles without being signed in.
9. Create a `Post` with a missing `videoUrl`.
10. Update a post's `authorId`.
11. Inject non-alphanumeric characters into document IDs (poisoning).
12. Mass-read the `likes` collection without specifying a query.

## 3. Test Runner (Draft Rules)
The rules will be verified using the CLI or integrated checks.
