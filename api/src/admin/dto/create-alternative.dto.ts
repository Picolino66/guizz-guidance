import { IsBoolean, IsInt, IsString, Min } from "class-validator";

export class CreateAlternativeDto {
  @IsString()
  text!: string;

  @IsBoolean()
  isCorrect!: boolean;

  @IsInt()
  @Min(1)
  order!: number;
}
