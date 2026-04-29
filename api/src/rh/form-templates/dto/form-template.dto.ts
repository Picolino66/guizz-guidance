import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator"
import { Type } from "class-transformer"

export enum FormQuestionTypeEnum {
  YES_NO = "YES_NO",
  TEXT = "TEXT",
  TEXTAREA = "TEXTAREA",
  SINGLE_CHOICE = "SINGLE_CHOICE",
  NUMBER = "NUMBER"
}

export class CreateQuestionDto {
  @IsString()
  label!: string

  @IsEnum(FormQuestionTypeEnum)
  type!: FormQuestionTypeEnum

  @IsBoolean()
  required!: boolean

  @IsArray()
  @IsString({ each: true })
  options!: string[]
}

export class CreateFormTemplateDto {
  @IsString()
  name!: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions!: CreateQuestionDto[]
}

export class UpdateFormTemplateDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[]
}
