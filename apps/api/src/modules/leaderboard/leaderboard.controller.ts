import { Controller, Get, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiResponse } from '@lms/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { LeaderboardService, LeaderboardFilters, LeaderboardView } from './leaderboard.service';

@Controller('api/v1')
export class LeaderboardController {
  constructor(private leaderboard: LeaderboardService) {}

  @Get('admin/leaderboard')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async adminLeaderboard(
    @CurrentUser() user: AuthUser,
    @Query() query: LeaderboardFilters & { view?: string },
  ): Promise<ApiResponse> {
    const data = await this.leaderboard.getLeaderboard(
      { ...query, view: (query.view as LeaderboardView) || 'organization' },
      { companyId: user.companyId, currentUserId: user.id },
    );
    return { success: true, message: 'Leaderboard retrieved', data };
  }

  @Get('leaderboard')
  async learnerLeaderboard(
    @CurrentUser() user: AuthUser,
    @Query() query: LeaderboardFilters & { view?: string },
  ): Promise<ApiResponse> {
    const visible = await this.leaderboard.isVisibleToLearners(query.trainingId);
    if (!visible) {
      return {
        success: true,
        message: 'Leaderboard not visible',
        data: {
          view: query.view || 'organization',
          lowestRank: 0,
          me: null,
          topEntries: [],
          nearbyEntries: [],
          entries: [],
          departmentRankings: [],
        },
      };
    }
    const data = await this.leaderboard.getLeaderboard(
      { ...query, view: (query.view as LeaderboardView) || 'organization' },
      { companyId: user.companyId, currentUserId: user.id },
    );
    return { success: true, message: 'Leaderboard retrieved', data };
  }
}
