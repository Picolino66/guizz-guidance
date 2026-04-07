import { IsOptional, IsUUID } from "class-validator";

export class FinishParticipantDto {
  @IsOptional()
  @IsUUID()
  quizId?: string;
}
