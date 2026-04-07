import { IsDateString, IsInt, IsString, Min } from "class-validator";

export class CreateQuizDto {
  @IsString()
  title!: string;

  @IsDateString()
  startTime!: string;

  @IsInt()
  @Min(60)
  durationSeconds!: number;
}
