import { IsUUID } from "class-validator";

export class AnswerQuestionDto {
  @IsUUID()
  questionId!: string;

  @IsUUID()
  alternativeId!: string;
}
