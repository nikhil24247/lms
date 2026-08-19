import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { DiscussionType, UserRole } from '@prisma/client';
import { ApiResponse } from '@lms/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { CommunityService } from './community.service';

@Controller('api/v1')
export class CommunityController {
  constructor(private community: CommunityService) {}

  @Get('community/posts')
  async list(
    @Query('type') type?: DiscussionType,
    @Query('trainingId') trainingId?: string,
  ): Promise<ApiResponse> {
    const data = await this.community.listPosts({ type, trainingId });
    return { success: true, message: 'Posts retrieved', data };
  }

  @Get('community/posts/:id')
  async get(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.community.getPost(id);
    return { success: true, message: 'Post retrieved', data };
  }

  @Post('community/posts')
  async create(
    @Body() dto: { type?: DiscussionType; title?: string; body: string; trainingId?: string },
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse> {
    const data = await this.community.createPost(user, dto);
    return { success: true, message: 'Post created', data };
  }

  @Post('community/posts/:id/replies')
  async reply(
    @Param('id') id: string,
    @Body() dto: { body: string },
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse> {
    const data = await this.community.reply(id, user, dto.body);
    return { success: true, message: 'Reply added', data };
  }

  @Delete('community/posts/:id')
  async deletePost(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<ApiResponse> {
    const data = await this.community.deletePost(id, user, false);
    return { success: true, message: 'Post deleted', data };
  }

  @Delete('community/replies/:id')
  async deleteReply(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<ApiResponse> {
    const data = await this.community.deleteReply(id, user, false);
    return { success: true, message: 'Reply deleted', data };
  }

  @Get('admin/community/posts')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async adminList(@Query('type') type?: DiscussionType): Promise<ApiResponse> {
    const data = await this.community.listPosts({ type });
    return { success: true, message: 'Posts retrieved', data };
  }

  @Delete('admin/community/posts/:id')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async adminDeletePost(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<ApiResponse> {
    const data = await this.community.deletePost(id, user, true);
    return { success: true, message: 'Post deleted', data };
  }

  @Delete('admin/community/replies/:id')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async adminDeleteReply(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<ApiResponse> {
    const data = await this.community.deleteReply(id, user, true);
    return { success: true, message: 'Reply deleted', data };
  }
}
