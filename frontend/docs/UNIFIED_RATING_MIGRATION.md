# Unified Rating System Migration Guide

## Overview

This document describes the migration from multiple rating fields (fide_rating, chesscom_rating, lichess_rating) to a unified rating field in the users table.

## Changes Made

### Database Schema Changes

The migration removes the following fields from the `users` table:
- `fide_rating` (INTEGER, nullable)
- `chesscom_rating` (INTEGER, nullable) 
- `lichess_rating` (INTEGER, nullable)

And adds a new unified field:
- `rating` (INTEGER, NOT NULL, DEFAULT 800, CHECK constraint: 100-3000)

### TypeScript Interface Updates

The `User` and `UserProfileData` interfaces have been updated:

```typescript
// Before
interface User {
  fide_rating: number | null
  chesscom_rating: number | null
  lichess_rating: number | null
  // ... other fields
}

// After
interface User {
  rating: number  // Unified rating field (100-3000)
  // ... other fields
}
```

### API Changes

#### Profile API Endpoints
- `GET /api/profile` - Returns unified rating field
- `PUT /api/profile` - Accepts unified rating field only

#### Rating API Endpoints
All rating endpoints now work with the unified rating system:
- `POST /api/rating/calculate` - Calculates rating changes using Glicko2
- `GET /api/rating/leaderboard` - Returns users sorted by unified rating
- `GET /api/rating/player/[userId]` - Returns player's unified rating stats
- `GET /api/rating/history/[userId]` - Returns rating history

### Service Updates

#### RatingService
- `calculateInitialRating()` now uses the unified rating field
- Default rating is 800 (instead of 1500)
- RD (Rating Deviation) is calculated based on rating confidence

#### RatingValidator
- Validation now checks unified rating field only
- Minimum rating requirement: 100
- Removed cross-platform consistency checks

#### RatingPairingService
- Uses unified rating for pairing algorithms
- Maintains rating-based pairing quality
- Removed platform-specific rating logic

### UI Component Updates

#### Profile Components
- Profile display shows unified rating only
- Profile edit form accepts single rating field
- Rating input validation (100-3000 range)

#### Rating Components
- `RatingDisplay` - Shows unified rating with statistics
- `RatingLeaderboard` - Displays users by unified rating
- `RatingHistoryChart` - Charts rating progression over time

## Migration Process

### Step 1: Backup Current Data
```bash
# Create backup of users table
pg_dump -h localhost -U postgres chess_db -t users > users_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Migration Script
```bash
# Apply SQL migration
psql -h localhost -U postgres chess_db < database/migrations/20241115_unify_user_ratings.sql

# Or use the Node.js migration script
node scripts/migrate-unified-rating.js
```

### Step 3: Verify Data Integrity
```sql
-- Check for any data issues
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN rating < 100 OR rating > 3000 THEN 1 END) as invalid_ratings,
  MIN(rating) as min_rating,
  MAX(rating) as max_rating,
  AVG(rating) as avg_rating
FROM users;
```

### Step 4: Test Application
- Run unit tests: `npm test`
- Run integration tests: `npm run test:integration`
- Test rating calculations manually
- Verify pairing system works correctly

## Rollback Plan

If issues are encountered:

1. **Immediate Rollback** (within 5 minutes):
   ```bash
   psql -h localhost -U postgres chess_db < users_backup_*.sql
   ```

2. **Gradual Rollback** (if data has been modified):
   ```bash
   # Restore from backup with data merge
   node scripts/rollback-unified-rating.js
   ```

## Code Examples

### Getting User Rating
```typescript
// Before
const userRating = user.fide_rating || user.chesscom_rating || user.lichess_rating || 800

// After
const userRating = user.rating // Always available, default 800
```

### Updating User Rating
```typescript
// Before
await updateUserProfile(userId, {
  fide_rating: 1800,
  chesscom_rating: 1750,
  lichess_rating: 1700
})

// After
await updateUserProfile(userId, {
  rating: 1750 // Single unified rating
})
```

### Rating Validation
```typescript
// Before
const isValid = !!(user.fide_rating || user.chesscom_rating || user.lichess_rating)

// After
const isValid = user.rating >= 100
```

## Testing

### Unit Tests
- `lib/rating/__tests__/unifiedRating.test.ts` - Tests unified rating logic
- `lib/rating/__tests__/ratingService.test.ts` - Tests rating calculations
- `lib/rating/__tests__/ratingValidator.test.ts` - Tests rating validation

### Integration Tests
- Test rating calculations with real data
- Verify pairing system with unified ratings
- Test API endpoints with new rating structure

### Performance Tests
- Measure query performance with new schema
- Test rating calculations under load
- Verify pairing algorithm efficiency

## Deployment Checklist

- [ ] Database migration applied successfully
- [ ] All TypeScript compilation errors resolved
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Performance benchmarks met
- [ ] Rollback plan tested
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team trained on new system

## Monitoring

Monitor the following after deployment:
- Rating calculation accuracy
- System performance metrics
- Error rates in rating APIs
- User feedback on new system
- Database query performance

## Support

For issues or questions:
- Check application logs: `npm run logs`
- Review migration logs in `logs/migration-*.log`
- Contact development team via Slack #rating-system
- Emergency rollback: Contact on-call engineer

## Future Enhancements

Consider these improvements:
- Add rating history tracking
- Implement rating categories (blitz, rapid, classical)
- Add rating analytics dashboard
- Implement rating decay for inactive users
- Add rating import from external platforms