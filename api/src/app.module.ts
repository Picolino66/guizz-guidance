import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { AuthModule } from "./auth/auth.module";
import { QuizModule } from "./quiz/quiz.module";
import { ParticipantModule } from "./participant/participant.module";
import { RankingModule } from "./ranking/ranking.module";
import { AdminModule } from "./admin/admin.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { AppController } from "./app.controller";
import { RhModule } from "./rh/rh.module";
import { WhatsappModule } from "./whatsapp/whatsapp.module";

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    RealtimeModule,
    AuthModule,
    QuizModule,
    ParticipantModule,
    RankingModule,
    AdminModule,
    RhModule,
    WhatsappModule
  ]
})
export class AppModule {}
