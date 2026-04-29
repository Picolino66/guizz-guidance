import { IsArray, IsOptional, IsString } from "class-validator"

export class CreateJobDto {
  @IsString()
  titulo!: string

  @IsString()
  nivel!: string

  @IsOptional()
  @IsString()
  descricao?: string

  @IsArray()
  @IsString({ each: true })
  stackTags!: string[]
}

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  titulo?: string

  @IsOptional()
  @IsString()
  nivel?: string

  @IsOptional()
  @IsString()
  descricao?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stackTags?: string[]
}
