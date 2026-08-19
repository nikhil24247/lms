import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DiscussionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class CommunityService {
  constructor(private prisma: PrismaService) {}

  async listPosts(filters?: { type?: DiscussionType; trainingId?: string }) {
    return this.prisma.discussionPost.findMany({
      where: {
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.trainingId ? { trainingId: filters.trainingId } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, department: { select: { name: true } } } },
        training: { select: { title: true } },
        _count: { select: { replies: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
  }

  async getPost(id: string) {
    const post = await this.prisma.discussionPost.findUnique({
      where: { id },
      include: {
        user: { select: { fullName: true, department: { select: { name: true } } } },
        training: { select: { title: true } },
        replies: {
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async createPost(
    user: AuthUser,
    dto: { type?: DiscussionType; title?: string; body: string; trainingId?: string },
  ) {
    return this.prisma.discussionPost.create({
      data: {
        userId: user.id,
        type: dto.type ?? DiscussionType.FEED,
        title: dto.title,
        body: dto.body,
        trainingId: dto.trainingId,
      },
      include: {
        user: { select: { fullName: true } },
        _count: { select: { replies: true } },
      },
    });
  }

  async reply(postId: string, user: AuthUser, body: string) {
    await this.getPost(postId);
    return this.prisma.discussionReply.create({
      data: { postId, userId: user.id, body },
      include: { user: { select: { fullName: true } } },
    });
  }

  async deletePost(id: string, user: AuthUser, isAdmin = false) {
    const post = await this.getPost(id);
    if (!isAdmin && post.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own posts');
    }
    await this.prisma.discussionPost.delete({ where: { id } });
    return { deleted: true };
  }

  async deleteReply(replyId: string, user: AuthUser, isAdmin = false) {
    const reply = await this.prisma.discussionReply.findUnique({ where: { id: replyId } });
    if (!reply) throw new NotFoundException('Reply not found');
    if (!isAdmin && reply.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own replies');
    }
    await this.prisma.discussionReply.delete({ where: { id: replyId } });
    return { deleted: true };
  }
}
