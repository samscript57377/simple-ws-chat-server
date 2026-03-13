# WebSocket Chat Server - Test Suite

This test suite provides comprehensive coverage for the WebSocket chat server using Jest.

## Test Coverage

### Connection Management
- ✅ Accept client connections
- ✅ Assign unique client IDs
- ✅ Remove clients on disconnect

### Room Management
- ✅ Create new rooms on first join
- ✅ Add users to existing rooms
- ✅ Store welcome messages
- ✅ Delete empty rooms
- ✅ Maintain rooms with active users

### Join Messages
- ✅ Broadcast join notifications to room members
- ✅ Generate random join messages
- ✅ Handle default usernames

### Regular Messages
- ✅ Broadcast messages to all room members
- ✅ Store messages in room history
- ✅ Preserve message styling and metadata

### Emoji Messages
- ✅ Broadcast emoji reactions
- ✅ Store emojis in room history
- ✅ Preserve emoji styling

### Error Handling
- ✅ Ignore invalid JSON
- ✅ Handle messages from users not in rooms

### Multiple Rooms
- ✅ Keep message history separate between rooms
- ✅ Route messages only to correct room members

## Setup

Install dependencies:
```bash
npm install
```

This will install:
- **ws**: WebSocket library (already in dependencies)
- **uuid**: For generating unique client IDs (add to dependencies)
- **jest**: Testing framework (add to devDependencies)

## Running Tests

```bash
npm test
```

To run tests in watch mode:
```bash
npm test -- --watch
```

For verbose output:
```bash
npm test -- --verbose
```

## Test Structure

Each test:
1. Creates WebSocket connections to the server
2. Performs specific actions (join room, send message, etc.)
3. Validates that the expected behavior occurred
4. Cleans up connections

Tests use timeouts to allow the server time to process messages asynchronously.

## Notes

- Tests must be run with the server code properly integrated
- The test file includes the server logic inline for isolated testing
- Each test cleans up rooms and clients before running
- Multiple tests verify concurrent user scenarios
- Tests validate both internal state and WebSocket message broadcasting

## Future Improvements

- Add performance/load testing
- Add tests for server restart/recovery
- Add validation for message timestamps
- Test maximum room/message limits
- Add integration tests with the client application
