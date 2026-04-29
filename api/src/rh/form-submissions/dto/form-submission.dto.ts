import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator"
import { Type } from "class-transformer"

export class AnswerDto {
  @IsString()
  questionId!: string

  @IsOptional()
  @IsString()
  valueText?: string

  @IsOptional()
  @IsNumber()
  valueNumber?: number

  @IsOptional()
  @IsBoolean()
  valueBoolean?: boolean

  @IsOptional()
  @IsString()
  valueChoice?: string
}

export class SubmitFormDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[]
}
