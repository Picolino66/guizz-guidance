import { IsUUID } from "class-validator";

export class StartParticipantDto {
  @IsUUID()
  quizId!: string;
}
