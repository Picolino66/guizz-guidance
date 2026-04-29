import { IsOptional, IsString } from "class-validator"

export class CreateCandidateDto {
  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  linkedinUrl?: string

  @IsOptional()
  @IsString()
  pretensaoSenioridade?: string

  @IsString()
  cidadeEstado!: string

  @IsString()
  formacao!: string

  @IsString()
  resumoProfissional!: string

  @IsString()
  ferramentas!: string

  @IsString()
  motivacaoMudanca!: string
}

export class UpdateCandidateDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  linkedinUrl?: string

  @IsOptional()
  @IsString()
  pretensaoSenioridade?: string

  @IsOptional()
  @IsString()
  cidadeEstado?: string

  @IsOptional()
  @IsString()
  formacao?: string

  @IsOptional()
  @IsString()
  resumoProfissional?: string

  @IsOptional()
  @IsString()
  ferramentas?: string

  @IsOptional()
  @IsString()
  motivacaoMudanca?: string
}
