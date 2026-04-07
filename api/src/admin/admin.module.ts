import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminAuthGuard } from "../common/guards/admin-auth.guard";
import { QuizModule } from "../quiz/quiz.module";
import { RankingModule } from "../ranking/ranking.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [AuthModule, QuizModule, RankingModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthGuard]
})
export class AdminModule {}
