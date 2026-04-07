import { IsInt, IsString, Min } from "class-validator";

export class CreateQuestionDto {
  @IsString()
  title!: string;

  @IsInt()
  @Min(1)
  order!: number;
}
